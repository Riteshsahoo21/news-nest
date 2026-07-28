import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
import axios from 'axios';

const generateToken = (user) => {
  return jwt.sign({ userId: user._id, roles: user.roles || (user.role ? [user.role] : []) }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const register = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password, captchaToken } = req.body;

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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email,
      mobileNumber,
      password: hashedPassword,
      authProvider: 'local',
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        _id: user._id,
        fullName: user.fullName,
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
      user = await User.create({
        fullName: name || 'Google User',
        email,
        authProvider: 'google',
      });
    }

    const token = generateToken(user);

    res.json({
      message: 'Google Sign-In successful',
      user: {
        _id: user._id,
        fullName: user.fullName,
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
