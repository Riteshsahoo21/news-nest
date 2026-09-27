import cron from 'node-cron';
import News from '../models/News.js';
import { sendEmailBlast } from '../controllers/newsletterController.js';

export const initNewsletterCron = () => {
  // Schedule to run every day at 17:56
  cron.schedule('56 17 * * *', async () => {
    try {
      console.log('Running automated newsletter digest job...');
      
      const Settings = (await import('../models/Settings.js')).default;
      let settings = await Settings.findOne({ isGlobal: true });
      if (!settings) {
        settings = await Settings.create({ isGlobal: true });
      }

      if (!settings.newsletterEnabled) {
        console.log('Automated newsletters are disabled in Settings. Skipping.');
        return;
      }

      // Check Frequency Logic
      const now = new Date();
      if (settings.lastAutomatedBlast) {
        const diffInDays = (now - settings.lastAutomatedBlast) / (1000 * 60 * 60 * 24);
        
        if (settings.newsletterFrequency === 'every_3_days' && diffInDays < 3) {
          console.log(`Skipping newsletter: Frequency is every 3 days. Last sent ${diffInDays.toFixed(1)} days ago.`);
          return;
        }
        
        if (settings.newsletterFrequency === 'weekly' && diffInDays < 7) {
          console.log(`Skipping newsletter: Frequency is weekly. Last sent ${diffInDays.toFixed(1)} days ago.`);
          return;
        }
      }
      
      // Fetch top 3 trending/most viewed articles from the last 24 hours (or since last blast)
      const lastBlastDate = settings.lastAutomatedBlast || new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const topArticles = await News.find({ 
        status: 'approved',
        createdAt: { $gte: lastBlastDate }
      })
      .sort({ views: -1, likesCount: -1 })
      .limit(3);

      if (topArticles.length === 0) {
        console.log('No new articles to send in the digest.');
        return;
      }

      // Generate HTML content
      let htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="text-align: center; color: #dc2626;">News Nests Top Stories</h1>
          <p style="text-align: center; font-size: 16px; color: #666;">Here are the hottest topics you might have missed.</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      `;

      topArticles.forEach(article => {
        htmlContent += `
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0;"><a href="http://localhost:5173/article/${article._id}" style="color: #111; text-decoration: none;">${article.title}</a></h2>
            ${article.imageUrl ? `<img src="${article.imageUrl}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 10px;" alt="Cover" />` : ''}
            <p style="color: #555; line-height: 1.5; margin: 0;">${article.subtitle || article.content.substring(0, 150) + '...'}</p>
            <a href="http://localhost:5173/article/${article._id}" style="display: inline-block; margin-top: 10px; color: #dc2626; text-decoration: none; font-weight: bold;">Read more &rarr;</a>
          </div>
        `;
      });

      htmlContent += `
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="text-align: center; font-size: 12px; color: #999;">
            You are receiving this because you subscribed to our newsletter.<br/>
            To unsubscribe, please visit your profile or reply to this email.
          </p>
        </div>
      `;

      // Use the helper from the controller
      await sendEmailBlast('📰 Your News Nests Digest', htmlContent, true);
      console.log('Automated digest sent successfully.');
      
      settings.lastAutomatedBlast = now;
      await settings.save();

    } catch (error) {
      console.error('Error in automated newsletter digest:', error);
    }
  });

  console.log('Newsletter cron initialized: Daily digest scheduled for 17:56.');
};
