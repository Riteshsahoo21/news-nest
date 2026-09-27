import LiveBlog from '../models/LiveBlog.js';
import News from '../models/News.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Middleware to intercept Requests from Social Media bots (WhatsApp, Twitter, Telegram, LinkedIn, Discord).
 * Serves fully hydrated static Open Graph (OG) HTML meta tags for instant rich thumbnail card previews.
 */
export const socialBotInterceptor = async (req, res, next) => {
  const { id, slug } = req.query;
  const paramId = id || req.params.idOrSlug || slug;
  if (!paramId) {
    if (req.path.includes('/share')) return res.redirect(302, CLIENT_URL);
    return next();
  }

  const userAgent = req.headers['user-agent'] || '';
  const isSocialBot = /whatsapp|twitterbot|facebookexternalhit|telegrambot|linkedinbot|slackbot|discordbot|googlebot/i.test(userAgent);

  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(paramId);
    let doc = null;
    let type = 'live-blog';
    let redirectPath = `/live-blogs?id=${paramId}`;

    if (req.path.includes('news') || req.path.includes('article')) {
      type = 'article';
      redirectPath = `/?articleId=${paramId}`;
      doc = isObjectId ? await News.findById(paramId) : await News.findOne({ slug: paramId });
    } else {
      doc = isObjectId ? await LiveBlog.findById(paramId) : await LiveBlog.findOne({ slug: paramId });
      if (!doc) {
        // Fallback check in News collection
        doc = isObjectId ? await News.findById(paramId) : await News.findOne({ slug: paramId });
        if (doc) {
          type = 'article';
          redirectPath = `/?articleId=${paramId}`;
        }
      }
    }

    if (!doc) {
      if (req.path.includes('/share')) return res.redirect(302, CLIENT_URL);
      return next();
    }

    // If regular web visitor (and not forcing OG simulation or being scraped by a social bot),
    // cleanly redirect them directly into the interactive frontend React application!
    if (!isSocialBot && !req.query.force_og) {
      if (req.originalUrl.includes('/share') || req.originalUrl.includes('/api/share')) {
        return res.redirect(302, `${CLIENT_URL}${redirectPath}`);
      }
      return next();
    }

    const title = doc.seoTitle || doc.title || 'Breaking News Coverage - News Nests';
    const description = (doc.metaDescription || doc.description || doc.subtitle || doc.content || 'Real-time journalism and active live broadcast feeds.')
      .toString()
      .replace(/<[^>]*>?/gm, '') // Strip markdown/HTML
      .substring(0, 180);
    const imageUrl = doc.mainImageUrl || doc.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200';
    const canonical = doc.canonicalUrl || `${CLIENT_URL}${redirectPath}`;

    // Return instant static Open Graph HTML payload
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} | News Nests</title>
  <meta name="description" content="${description}" />
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="${type === 'live-blog' ? 'website' : 'article'}" />
  <meta property="og:site_name" content="News Nests Editorial Room" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${canonical}" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@NewsNests" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- Fallback redirection for regular web visitors -->
  <meta http-equiv="refresh" content="0; url=${canonical}" />
</head>
<body style="background:#0f172a; color:#f8f9fa; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
  <p>Redirecting to <a href="${canonical}" style="color:#ef4444; font-weight:bold;">${title}</a>...</p>
</body>
</html>`;

    res.status(200).send(html);
  } catch (error) {
    console.error('Social Bot Interception Error:', error);
    next();
  }
};
