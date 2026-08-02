import News from '../models/News.js';
import LiveBlog from '../models/LiveBlog.js';
import Category from '../models/Category.js';

const DOMAIN = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Serves standard XML sitemap for general crawler discovery
 */
export const getGeneralSitemap = async (req, res) => {
  try {
    const news = await News.find({ status: 'approved' }).select('slug _id updatedAt').limit(500).sort({ updatedAt: -1 });
    const liveBlogs = await LiveBlog.find({ isLive: true }).select('slug _id updatedAt').limit(200).sort({ updatedAt: -1 });
    const categories = await Category.find().select('name');

    const staticRoutes = [
      { path: '', freq: 'always', priority: '1.0' },
      { path: '/live-blogs', freq: 'always', priority: '1.0' },
      { path: '/videos', freq: 'hourly', priority: '0.8' },
      { path: '/photo-gallery', freq: 'daily', priority: '0.7' },
      { path: '/categories', freq: 'daily', priority: '0.7' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    staticRoutes.forEach(route => {
      xml += `
  <url>
    <loc>${DOMAIN}${route.path}</loc>
    <changefreq>${route.freq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
    });

    // Categories
    categories.forEach(cat => {
      xml += `
  <url>
    <loc>${DOMAIN}/category/${encodeURIComponent(cat.name.toLowerCase())}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Active Live Blogs
    liveBlogs.forEach(blog => {
      const path = blog.slug ? `/live-blogs?id=${blog.slug}` : `/live-blogs?id=${blog._id}`;
      xml += `
  <url>
    <loc>${DOMAIN}${path}</loc>
    <lastmod>${new Date(blog.updatedAt || Date.now()).toISOString()}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    // Published Articles
    news.forEach(art => {
      const path = art.slug ? `/article/${art.slug}` : `/article/${art._id}`;
      xml += `
  <url>
    <loc>${DOMAIN}${path}</loc>
    <lastmod>${new Date(art.updatedAt || Date.now()).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap Generation Error:', error);
    res.status(500).send('Error generating sitemap');
  }
};

/**
 * Serves Google News 48-hour XML feed optimized for Top Stories indexing
 */
export const getGoogleNewsSitemap = async (req, res) => {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const news = await News.find({ 
      status: 'approved',
      updatedAt: { $gte: fortyEightHoursAgo }
    }).select('title slug _id updatedAt category author').sort({ updatedAt: -1 }).limit(100);

    const liveBlogs = await LiveBlog.find({
      isLive: true,
      updatedAt: { $gte: fortyEightHoursAgo }
    }).select('title slug _id updatedAt category').sort({ updatedAt: -1 }).limit(50);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">`;

    liveBlogs.forEach(blog => {
      const path = blog.slug ? `/live-blogs?id=${blog.slug}` : `/live-blogs?id=${blog._id}`;
      const pubDate = new Date(blog.updatedAt || Date.now()).toISOString();
      xml += `
  <url>
    <loc>${DOMAIN}${path}</loc>
    <news:news>
      <news:publication>
        <news:name>News Nests</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${blog.title ? blog.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Live News'}</news:title>
      <news:keywords>Live News, ${blog.category || 'Breaking'}, Breaking News</news:keywords>
    </news:news>
  </url>`;
    });

    news.forEach(art => {
      const path = art.slug ? `/article/${art.slug}` : `/article/${art._id}`;
      const pubDate = new Date(art.updatedAt || Date.now()).toISOString();
      xml += `
  <url>
    <loc>${DOMAIN}${path}</loc>
    <news:news>
      <news:publication>
        <news:name>News Nests</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${art.title ? art.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'News Report'}</news:title>
      <news:keywords>${art.category || 'News'}, Trending News</news:keywords>
    </news:news>
  </url>`;
    });

    xml += `
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Google News Sitemap Error:', error);
    res.status(500).send('Error generating news sitemap');
  }
};

/**
 * Serves RSS 2.0 XML feed with high-resolution image enclosures for aggregators
 */
export const getRssFeed = async (req, res) => {
  try {
    const news = await News.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(50);
    const liveBlogs = await LiveBlog.find({ isLive: true }).sort({ updatedAt: -1 }).limit(15);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>News Nests - Real-time News &amp; Live Journalism</title>
    <link>${DOMAIN}</link>
    <description>Latest breaking news, live interactive political and sports coverage, and high-definition investigative reports.</description>
    <language>en-us</language>
    <copyright>© 2026 News Nests Editorial Desk</copyright>
    <atom:link href="${DOMAIN}/api/feed/rss.xml" rel="self" type="application/rss+xml" />`;

    liveBlogs.forEach(blog => {
      const path = blog.slug ? `/live-blogs?id=${blog.slug}` : `/live-blogs?id=${blog._id}`;
      const url = `${DOMAIN}${path}`;
      const title = `🔴 LIVE: ${blog.title || 'Breaking Coverage'}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const desc = (blog.description || 'Watch live real-time coverage on News Nests.').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const img = blog.mainImageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200';

      xml += `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${desc}</description>
      <category>${blog.category || 'Live Coverage'}</category>
      <pubDate>${new Date(blog.updatedAt || Date.now()).toUTCString()}</pubDate>
      <media:content url="${img}" medium="image" />
    </item>`;
    });

    news.forEach(art => {
      const path = art.slug ? `/article/${art.slug}` : `/article/${art._id}`;
      const url = `${DOMAIN}${path}`;
      const title = (art.title || 'Report').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const desc = (art.subtitle || art.content || '').substring(0, 300).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const img = art.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200';

      xml += `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${desc}...</description>
      <author>${art.author || 'Editorial Room'}</author>
      <category>${art.category || 'News'}</category>
      <pubDate>${new Date(art.createdAt || Date.now()).toUTCString()}</pubDate>
      <media:content url="${img}" medium="image" />
    </item>`;
    });

    xml += `
  </channel>
</rss>`;

    res.header('Content-Type', 'application/rss+xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('RSS Generation Error:', error);
    res.status(500).send('Error generating RSS feed');
  }
};
