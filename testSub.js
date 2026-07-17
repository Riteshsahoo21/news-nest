import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from './models/SubscriptionPlan.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Clear old plans
    await SubscriptionPlan.deleteMany({});
    
    // Create new one
    const newPlan = await SubscriptionPlan.create({
      name: 'Test Plan',
      description: 'A test plan for verification',
      price: 199,
      duration: 'monthly',
      features: ['Ad-free', 'Premium articles']
    });
    
    console.log('Created Plan:', newPlan.name, newPlan.price, newPlan.features);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
