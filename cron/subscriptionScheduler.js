import cron from 'node-cron';
import User from '../models/User.js';

export const initSubscriptionCron = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily subscription expiration check...');
    try {
      const now = new Date();
      
      // Find users who are premium but their expiry date is in the past
      const expiredUsers = await User.find({
        isPremium: true,
        subscriptionExpiry: { $lt: now }
      });

      if (expiredUsers.length > 0) {
        console.log(`Found ${expiredUsers.length} expired subscriptions. Cancelling...`);
        
        for (const user of expiredUsers) {
          user.isPremium = false;
          // Optionally clear the plan ID, but leaving it helps us know what they had
          // user.subscriptionPlanId = undefined; 
          await user.save();
        }
        
        console.log('Finished processing subscription expirations.');
      } else {
        console.log('No expired subscriptions found today.');
      }
    } catch (error) {
      console.error('Error running subscription expiration cron:', error);
    }
  });
};
