import 'dotenv/config';
import mongoose from 'mongoose';
import LiveBlog from '../models/LiveBlog.js';

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Clean Unsplash images from ALL live blogs and updates
  const allBlogs = await LiveBlog.find({});
  let cleanedUnsplashCount = 0;

  for (const b of allBlogs) {
    let dirty = false;
    if (b.mainImageUrl && b.mainImageUrl.includes('unsplash.com')) {
      b.mainImageUrl = '';
      dirty = true;
      cleanedUnsplashCount++;
    }

    if (Array.isArray(b.updates)) {
      for (const u of b.updates) {
        if (u.imageUrl && u.imageUrl.includes('unsplash.com')) {
          u.imageUrl = '';
          dirty = true;
          cleanedUnsplashCount++;
        }
      }
    }

    if (dirty) {
      await b.save();
    }
  }

  console.log(`Cleaned unsplash references from ${cleanedUnsplashCount} fields across live blogs.`);

  // 2. Specific fix for CS2 Grand Final (Vitality vs Aurora) - ID 6ab9491b62c52001c0f1ae75
  const cs2Query = {
    $or: [
      { _id: mongoose.Types.ObjectId.isValid('6ab9491b62c52001c0f1ae75') ? new mongoose.Types.ObjectId('6ab9491b62c52001c0f1ae75') : null },
      { title: { $regex: /Vitality vs Aurora/i } },
      { slug: { $regex: /vitality-vs-aurora/i } }
    ].filter(q => q._id !== null || q.title || q.slug)
  };

  const cs2Blog = await LiveBlog.findOne(cs2Query);
  if (cs2Blog) {
    console.log(`Found CS2 Grand Final blog: ${cs2Blog._id} - ${cs2Blog.title}`);
    cs2Blog.mainImageUrl = '';
    cs2Blog.isLive = false;
    cs2Blog.isStreamActive = false;
    cs2Blog.matchStatus = {
      team1: { name: 'Team Vitality', score: '3' },
      team2: { name: 'Aurora Gaming', score: '1' },
      matchInfo: 'Match Complete: Vitality win StarSeries Fall 2026 (3-1)',
      customStats: [
        { label: 'Map 1 (Dust II)', value: 'Vitality 13 - 10 Aurora' },
        { label: 'Map 2 (Mirage)', value: 'Vitality 9 - 13 Aurora' },
        { label: 'Map 3 (Inferno)', value: 'Vitality 13 - 8 Aurora' },
        { label: 'Map 4 (Nuke)', value: 'Vitality 13 - 9 Aurora' },
        { label: 'Grand Finals MVP', value: 'ZywOo (1.42 Rating)' },
        { label: 'Series Result', value: 'Vitality Champions (3-1)' }
      ]
    };

    // Check if concluding updates already exist
    const hasFinalBulletin = cs2Blog.updates.some(u => 
      u.title?.includes('CHAMPIONS') || u.content?.includes('crowned CS2 StarSeries Fall 2026 Champions')
    );

    if (!hasFinalBulletin) {
      cs2Blog.updates.unshift(
        {
          title: 'CHAMPIONS CROWNED: TEAM VITALITY (3-1)',
          content: 'Team Vitality seal Map 4 on Nuke (13-9) to conquer the Grand Finals 3-1! ZywOo locks down the B-site retake on round 22 with an AWP collateral triple, sealing tournament victory in historic fashion. Final MVP honors awarded to Mathieu "ZywOo" Herbaut with a stellar 1.42 HLTV rating across the series.',
          createdAt: new Date('2026-09-27T17:20:00.000Z')
        },
        {
          title: 'ROUND 21: VITALITY ON CHAMPIONSHIP POINT (12-9)',
          content: 'Apex and flameZ execute an aggressive ramp crunch against Aurora eco push. Vitality secure their 12th round and stand 1 round away from the StarSeries Fall 2026 trophy!',
          createdAt: new Date('2026-09-27T17:12:00.000Z')
        }
      );
    }

    await cs2Blog.save();
    console.log(`Successfully concluded CS2 blog and updated match telemetry to 3-1 Vitality.`);
  } else {
    console.log('CS2 Grand Final blog not found via query.');
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => mongoose.disconnect());
