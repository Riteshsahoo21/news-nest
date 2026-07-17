import Subscriber from '../models/Subscriber.js';
import Campaign from '../models/Campaign.js';
import nodemailer from 'nodemailer';

// Global transporter
let transporter = null;

// Initialize Nodemailer. If SMTP is not provided, use Ethereal (mock).
const initTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
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


// 1. Subscribe User
export const subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let sub = await Subscriber.findOne({ email: email.toLowerCase() });
    
    if (sub) {
      if (sub.isActive) {
        return res.status(400).json({ error: 'You are already subscribed!' });
      } else {
        sub.isActive = true;
        await sub.save();
        return res.json({ message: 'Resubscribed successfully!' });
      }
    }

    sub = await Subscriber.create({ email });
    res.status(201).json({ message: 'Subscribed successfully!' });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Unsubscribe User (GET route so users can just click a link)
export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).send('Email is required');

    const sub = await Subscriber.findOne({ email: email.toLowerCase() });
    if (sub) {
      sub.isActive = false;
      await sub.save();
    }
    
    // In a real app, render a nice HTML page here.
    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2>Unsubscribed Successfully</h2>
        <p>${email} will no longer receive our newsletter.</p>
        <a href="/">Return to Home</a>
      </div>
    `);
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).send('Internal server error');
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
