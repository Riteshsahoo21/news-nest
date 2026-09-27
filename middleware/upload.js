import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'news_images',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1000, crop: 'limit' }], // Optional: optimize size
  },
});

const upload = multer({ storage: storage });

// Configure Dynamic Media Storage for both Videos and Thumbnails (up to 100MB)
const mediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // If the uploaded file is a video
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      return {
        folder: 'news_videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'webm', 'avi', 'mkv'],
      };
    }
    // Otherwise treat as an image thumbnail or cover photo
    return {
      folder: 'news_images',
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 1200, crop: 'limit' }],
    };
  },
});

export const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB maximum upload size for video reporting
});

export default upload;
