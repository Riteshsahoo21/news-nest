import mongoose from 'mongoose';
import dotenv from 'dotenv';
import News from './models/News.js';
import LiveBlog from './models/LiveBlog.js';
import { createSlug } from './utils/slugify.js';

dotenv.config();

const migrateSlugs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for SEO Slug migration...');

    const articles = await News.find({});
    let articleCount = 0;
    for (const article of articles) {
      const newSlug = createSlug(article.title, article._id);
      if (article.slug !== newSlug) {
        article.slug = newSlug;
        await article.save();
        articleCount++;
      }
    }
    console.log(`Updated concise SEO keyword slugs for ${articleCount} news articles.`);

    const blogs = await LiveBlog.find({});
    let blogCount = 0;
    for (const blog of blogs) {
      const newSlug = createSlug(blog.title, blog._id);
      if (blog.slug !== newSlug) {
        blog.slug = newSlug;
        await blog.save();
        blogCount++;
      }
    }
    console.log(`Updated concise SEO keyword slugs for ${blogCount} live blogs.`);

    console.log('🎉 Migration finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating slugs:', error);
    process.exit(1);
  }
};

migrateSlugs();
