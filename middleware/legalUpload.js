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
    // Determine format based on mimetype or originalname
    let format = file.mimetype.split('/')[1];
    if (file.originalname.toLowerCase().endsWith('.pdf')) {
      format = 'pdf';
    }
    
    // Cloudinary needs resource_type: 'raw' or 'auto' for PDFs, but for images it can be 'image'.
    // If it's a pdf, we set format to pdf. For images, we let it be jpg/png.
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    
    return {
      folder: 'reporter_applications',
      format: isPdf ? 'pdf' : undefined,
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
      resource_type: 'auto', // Important for PDFs
    };
  },
});

const legalUpload = multer({ storage: storage });

export default legalUpload;
