import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    const user = await User.create({
      fullName: 'Test User',
      email: 'testxyz123@example.com',
      password: hashedPassword,
      authProvider: 'local'
    });
    
    console.log("User created:", user);
    await mongoose.disconnect();
  } catch(e) {
    console.error("Error creating user:", e.message, e.stack);
    await mongoose.disconnect();
  }
}
test();
