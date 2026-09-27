import User from '../models/User.js';
import OTP from '../models/OTP.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
import axios from 'axios';
import nodemailer from 'nodemailer';

const generateToken = (user) => {
  return jwt.sign({ userId: user._id, roles: user.roles || (user.role ? [user.role] : []) }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const sendRegistrationOTP = async (req, res) => {
  try {
    const { fullName, email, password, captchaToken } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Please provide fullName, email, and password' });
    }

    if (!captchaToken) {
      return res.status(400).json({ error: 'Please complete the CAPTCHA' });
    }

    // Verify CAPTCHA
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
    
    const captchaResponse = await axios.post(verifyUrl);
    if (!captchaResponse.data.success) {
      return res.status(400).json({ error: 'Failed CAPTCHA verification' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database (upsert if exists)
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    // Send Email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"News Nests" <newsletter@newsnests.com>',
      to: email,
      subject: "News Nests Registration OTP",
      text: `Your OTP for registration is: ${otp}. It is valid for 5 minutes.`,
      html: `<h3>Welcome to News Nests!</h3><p>Your OTP for registration is: <strong>${otp}</strong></p><p>It is valid for 5 minutes.</p>`,
    });

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
};

export const register = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password, otp } = req.body;

    if (!fullName || !email || !password || !otp) {
      return res.status(400).json({ error: 'Please provide all required fields including OTP' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email,
      mobileNumber,
      password: hashedPassword,
      authProvider: 'local',
    });

    // Delete OTP after successful registration
    await OTP.deleteOne({ email });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        roles: user.roles || (user.role ? [user.role] : []),
        role: user.roles && user.roles.length > 0 ? user.roles[0] : user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Internal server error', stack: error.stack });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    // Google-only users might not have a password
    if (!user.password) {
      return res.status(401).json({ error: 'Invalid login method for this account. Try Google Sign-In.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Logged in successfully',
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        roles: user.roles || (user.role ? [user.role] : []),
        role: user.roles && user.roles.length > 0 ? user.roles[0] : user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    // Verify token using Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { email, name, picture, uid } = decodedToken;

    if (!email) {
      return res.status(400).json({ error: 'Google account must have an email associated' });
    }

    let user = await User.findOne({ email });

    if (user && user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    // If user doesn't exist, create them
    if (!user) {
      let baseUsername = (name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await User.create({
        fullName: name || 'Google User',
        email,
        username,
        authProvider: 'google',
      });
    }

    const token = generateToken(user);

    res.json({
      message: 'Google Sign-In successful',
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        roles: user.roles || (user.role ? [user.role] : []),
        role: user.roles && user.roles.length > 0 ? user.roles[0] : user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(401).json({ error: 'Invalid or expired Google token' });
  }
};

export const logout = (req, res) => {
  // Since we are using stateless JWTs (not stored in DB or cookies by the backend),
  // true logout happens on the client side by deleting the token.
  // We provide this endpoint to complete the API structure and allow future implementations
  // like token blacklisting if needed.
  res.status(200).json({
    message: 'Logged out successfully. Please remove your auth token from local storage/cookies on the client side.'
  });
};
