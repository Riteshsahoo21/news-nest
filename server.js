import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { verifyToken } from './middleware/auth.js';
import { initializeApp, cert } from 'firebase-admin/app';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';

// Initialize Firebase Admin SDK
let firebaseApp;
try {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
  
  firebaseApp = initializeApp({
    credential: cert(serviceAccount)
  });
  console.log('Firebase Admin initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
}

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.warn('MONGO_URI is not defined in .env file. Skipping MongoDB connection.');
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('News Nests Backend API is running.');
});

// The decoded JWT payload will be accessible in req.user
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ 
    message: 'You have accessed a protected route!',
    user: req.user 
  });
});

// Example route using Firebase Admin
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', firebaseApp: firebaseApp ? firebaseApp.name : 'uninitialized' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
