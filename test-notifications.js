import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './models/Notification.js';
import NotificationReadReceipt from './models/NotificationReadReceipt.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/news-nests').then(async () => {
  console.log('Connected to MongoDB');
  const notifications = await Notification.find();
  console.log('Total notifications:', notifications.length);
  console.log('Notifications:', notifications);
  
  const receipts = await NotificationReadReceipt.find();
  console.log('Total receipts:', receipts.length);
  
  mongoose.connection.close();
}).catch(console.error);
