import express from 'express';
import upload from '../middleware/upload.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, authorizeRoles('admin', 'editor', 'reporter'), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    // multer-storage-cloudinary stores the uploaded URL in req.file.path
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Endpoint for regular users to upload avatars
router.post('/avatar', verifyToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Avatar Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;
