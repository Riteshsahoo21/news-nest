import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Reporter
    const reporter = await User.findOneAndUpdate(
      { email: 'reporter@example.com' },
      {
        fullName: 'Daily Reporter',
        password: hashedPassword,
        role: 'reporter',
        authProvider: 'local',
      },
      { upsert: true, new: true }
    );
    console.log('Reporter seeded:', reporter.email);

    // Create Editor
    const editor = await User.findOneAndUpdate(
      { email: 'editor@example.com' },
      {
        fullName: 'Chief Editor',
        password: hashedPassword,
        role: 'editor',
        authProvider: 'local',
      },
      { upsert: true, new: true }
    );
    console.log('Editor seeded:', editor.email);

    // Create Admin
    const admin = await User.findOneAndUpdate(
      { email: 'admin@example.com' },
      {
        fullName: 'System Admin',
        password: hashedPassword,
        role: 'admin',
        authProvider: 'local',
      },
      { upsert: true, new: true }
    );
    console.log('Admin seeded:', admin.email);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
