import mongoose from 'mongoose';
import dotenv from 'dotenv';
import News from './models/News.js';
import User from './models/User.js';
import { getCategoryFallbackImage } from './services/imageFallbacks.js';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.\n');

    const allArticles = await News.find().select('title category subCategory country imageUrl mainImageUrl');
    console.log(`Auditing ${allArticles.length} articles for image validity...`);

    let updatedCount = 0;

    for (const article of allArticles) {
      let needsUpdate = false;
      let img = (article.imageUrl || '').trim();

      // If empty, null, 'null', or invalid protocol
      if (!img || img === 'null' || img === 'undefined' || (!img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('/uploads/'))) {
        img = getCategoryFallbackImage(article.category, article.subCategory, article.country);
        needsUpdate = true;
      }

      // Also ensure mainImageUrl is synced
      if (!article.mainImageUrl || article.mainImageUrl !== img) {
        needsUpdate = true;
      }

      if (needsUpdate) {
        await News.updateOne(
          { _id: article._id },
          {
            $set: {
              imageUrl: img,
              mainImageUrl: img
            }
          }
        );
        updatedCount++;
      }
    }

    console.log(`\n🎉 Image Audit & Fix Complete! Updated ${updatedCount} articles.`);
    
    // Verify count of empty image articles
    const remainingEmpty = await News.countDocuments({
      $or: [
        { imageUrl: { $exists: false } },
        { imageUrl: '' },
        { imageUrl: null }
      ]
    });
    console.log(`Remaining articles without image in DB: ${remainingEmpty}`);

    process.exit(0);
  } catch (err) {
    console.error('Error during image fix:', err);
    process.exit(1);
  }
};

run();
