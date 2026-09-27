import Subscriber from '../models/Subscriber.js';
import Campaign from '../models/Campaign.js';
import nodemailer from 'nodemailer';

// Global transporter
let transporter = null;

// Initialize Nodemailer. If SMTP is not provided, use Ethereal (mock).
const initTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const isGmail = process.env.SMTP_HOST.includes('gmail');
    const transportConfig = isGmail 
      ? {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }
      : {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        };
    transporter = nodemailer.createTransport(transportConfig);
  } else {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Created Ethereal Test Account for Newsletters:", testAccount.user);
  }
};
initTransporter();

// Helper to send email blast
export const sendEmailBlast = async (subject, htmlContent, isAutomated = false) => {
  try {
    if (!transporter) await initTransporter();
    const subscribers = await Subscriber.find({ isActive: true });
    if (subscribers.length === 0) return 0;
    
    const bccList = subscribers.map(sub => sub.email).join(',');

    const senderEmail = process.env.SMTP_FROM_EMAIL || 'newsletter@newsnests.com';

    const info = await transporter.sendMail({
      from: `"News Nests" <${senderEmail}>`, // sender address must be verified in Brevo
      to: "subscribers@newsnests.com", // list of receivers (fake to, real ones are in bcc)
      bcc: bccList, // BCC hides the emails from each other
      subject: subject,
      html: htmlContent,
    });
    
    console.log("Message sent: %s", info.messageId);
    if (info.messageId && transporter.options.host === "smtp.ethereal.email") {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    // Save to campaign history
    await Campaign.create({
      subject,
      content: htmlContent,
      type: isAutomated ? 'automated' : 'manual',
      status: 'sent',
      sentCount: subscribers.length
    });

    return subscribers.length;
  } catch (error) {
    console.error("Error sending blast:", error);
    await Campaign.create({
      subject,
      content: htmlContent,
      type: isAutomated ? 'automated' : 'manual',
      status: 'failed',
      sentCount: 0
    });
    throw error;
  }
};

// Automated digests use individual messages so preference/unsubscribe links
// can be personalized without exposing subscriber addresses to n8n or to BCC.
export const sendPersonalizedEmailBlast = async (subject, htmlContent, isAutomated = true) => {
  try {
    if (!transporter) await initTransporter();
    const subscribers = await Subscriber.find({ isActive: true });
    if (subscribers.length === 0) return 0;

    const senderEmail = process.env.SMTP_FROM_EMAIL || 'newsletter@newsnests.com';
    const concurrency = 5;
    let sentCount = 0;

    for (let index = 0; index < subscribers.length; index += concurrency) {
      const batch = subscribers.slice(index, index + concurrency);
      const results = await Promise.allSettled(batch.map((subscriber) => {
        const encodedEmail = encodeURIComponent(subscriber.email);
        const personalizedHtml = htmlContent
          .replaceAll('{{subscriber.email}}', encodedEmail)
          .replaceAll('{{subscriberEmail}}', encodedEmail);

        return transporter.sendMail({
          from: `"News Nests" <${senderEmail}>`,
          to: subscriber.email,
          subject,
          html: personalizedHtml,
        });
      }));
      sentCount += results.filter((result) => result.status === 'fulfilled').length;
    }

    await Campaign.create({
      subject,
      content: htmlContent,
      type: isAutomated ? 'automated' : 'manual',
      status: sentCount > 0 ? 'sent' : 'failed',
      sentCount
    });

    return sentCount;
  } catch (error) {
    console.error('Error sending personalized blast:', error);
    await Campaign.create({
      subject,
      content: htmlContent,
      type: isAutomated ? 'automated' : 'manual',
      status: 'failed',
      sentCount: 0
    });
    throw error;
  }
};


// 1. Subscribe User
export const subscribe = async (req, res) => {
  try {
    const { email, subscriptions, bindedUserEmail } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let sub = await Subscriber.findOne({ email: email.toLowerCase() });
    
    if (sub) {
      if (bindedUserEmail) sub.bindedUserEmail = bindedUserEmail.toLowerCase();
      if (sub.isActive) {
        await sub.save();
        return res.status(400).json({ error: 'You are already subscribed!' });
      } else {
        sub.isActive = true;
        if (subscriptions && Array.isArray(subscriptions)) sub.subscriptions = subscriptions;
        await sub.save();
        return res.json({ message: 'Resubscribed successfully!', subscriber: sub });
      }
    }

    sub = await Subscriber.create({ 
      email: email.toLowerCase(), 
      subscriptions: subscriptions || ['daily_briefing', 'breaking_news', 'market_watch'],
      bindedUserEmail: bindedUserEmail ? bindedUserEmail.toLowerCase() : null
    });
    res.status(201).json({ message: 'Subscribed successfully!', subscriber: sub });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all subscribed email accounts binded to a specific logged-in user email
export const getBindedAccounts = async (req, res) => {
  try {
    const { userEmail } = req.params;
    if (!userEmail) return res.status(400).json({ error: 'User email required' });

    const subscribers = await Subscriber.find({
      $or: [
        { bindedUserEmail: userEmail.toLowerCase(), isActive: true },
        { email: userEmail.toLowerCase(), isActive: true }
      ]
    }).sort({ createdAt: -1 });

    res.json({ accounts: subscribers.map(s => s.email) });
  } catch (error) {
    console.error('Error fetching binded accounts:', error);
    res.status(500).json({ error: 'Failed to fetch binded accounts' });
  }
};

// 2. Unsubscribe User (supports GET for email links and POST for interactive dashboard)
export const unsubscribe = async (req, res) => {
  try {
    const email = req.body.email || req.query.email;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const sub = await Subscriber.findOne({ email: email.toLowerCase() });
    if (sub) {
      sub.isActive = false;
      await sub.save();
    }
    
    if (req.method === 'GET') {
      return res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>Unsubscribed Successfully</h2>
          <p>${email} will no longer receive our newsletter.</p>
          <a href="/">Return to Home</a>
        </div>
      `);
    }

    res.json({ message: 'You have successfully unsubscribed from all newsletters.', active: false });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check status & active subscriptions for an email
export const checkStatus = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const sub = await Subscriber.findOne({ email: email.toLowerCase() });
    if (!sub || !sub.isActive) {
      return res.json({ isSubscribed: false, subscriptions: [] });
    }
    res.json({ isSubscribed: true, subscriptions: sub.subscriptions || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
};

// Update newsletter topic preferences
export const updatePreferences = async (req, res) => {
  try {
    const { email, subscriptions, isActive } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const sub = await Subscriber.findOne({ email: email.toLowerCase() });
    if (!sub) return res.status(404).json({ error: 'Subscriber record not found' });

    if (isActive !== undefined) sub.isActive = isActive;
    if (subscriptions && Array.isArray(subscriptions)) sub.subscriptions = subscriptions;
    await sub.save();

    res.json({ message: 'Newsletter preferences updated successfully!', subscriber: sub });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};


// 3. Get Subscribers (Admin)
export const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4. Remove Subscriber (Admin)
export const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    await Subscriber.findByIdAndDelete(id);
    res.json({ message: 'Subscriber deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 5. Get Campaigns (Admin)
export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 6. Manually Send Campaign (Admin)
export const sendManualCampaign = async (req, res) => {
  try {
    const { subject, content } = req.body;
    if (!subject || !content) {
      return res.status(400).json({ error: 'Subject and content required' });
    }

    const count = await sendEmailBlast(subject, content, false);
    res.json({ message: `Campaign sent successfully to ${count} subscribers!` });
  } catch (error) {
    console.error('Error sending manual campaign:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
};
