import mongoose from 'mongoose';
import 'dotenv/config';
import Role from './models/Role.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const adminRole = await Role.findOne({ name: 'admin' });
  if (adminRole && !adminRole.permissions.includes('manage_roles')) {
    adminRole.permissions.push('manage_roles');
    await adminRole.save();
    console.log('Successfully added manage_roles permission to admin role');
  } else {
    console.log('Admin already has manage_roles permission or role not found');
  }
  
  mongoose.disconnect();
};

run().catch(console.error);
