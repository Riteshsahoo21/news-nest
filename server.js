import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { verifyToken } from './middleware/auth.js';
import { initializeApp, cert } from 'firebase-admin/app';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import liveBlogRoutes from './routes/liveBlogRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import photoGalleryRoutes from './routes/photoGalleryRoutes.js';
import videoNewsRoutes from './routes/videoNewsRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import userAdminRoutes from './routes/userAdminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import { initCronJobs } from './cron/newsFetcher.js';
import { seedDefaultRoles } from './utils/seedRoles.js';

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
    .then(async () => {
      console.log('MongoDB connected successfully.');
      await seedDefaultRoles(); // Seed RBAC roles
    })
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.warn('MONGO_URI is not defined in .env file. Skipping MongoDB connection.');
}

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room for a specific article to receive real-time comments
  socket.on('join_article', (articleId) => {
    socket.join(articleId);
    console.log(`Socket ${socket.id} joined article room: ${articleId}`);
  });

  socket.on('leave_article', (articleId) => {
    socket.leave(articleId);
    console.log(`Socket ${socket.id} left article room: ${articleId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to req so controllers can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live-blogs', liveBlogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/photo-galleries', photoGalleryRoutes);
app.use('/api/videos', videoNewsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userAdminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/payments', paymentRoutes);

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
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize cron jobs
  initCronJobs();
});
