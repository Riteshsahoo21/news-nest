import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from './models/Role.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find reporter role
    const reporter = await Role.findOne({ name: 'reporter' }).lean();
    console.log(JSON.stringify(reporter, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
