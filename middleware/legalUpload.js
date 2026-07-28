import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary (it might already be configured elsewhere, but safe to do here)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Cloudinary needs resource_type: 'raw' for PDFs to avoid security blocks on image conversion
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    
    return {
      folder: 'reporter_applications',
      format: isPdf ? undefined : file.mimetype.split('/')[1], // undefined for raw resources
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
      resource_type: isPdf ? 'raw' : 'auto', 
    };
  },
});

const legalUpload = multer({ storage: storage });

export default legalUpload;
