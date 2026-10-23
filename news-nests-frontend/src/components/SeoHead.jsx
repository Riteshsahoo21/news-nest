import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Reusable enterprise SEO driver component.
 * Dynamically updates document metadata, Open Graph cards, canonical URLs, and structured JSON-LD schemas.
 * Automatically formats Cloudinary image URLs to >= 1200px for Google Discover compliance.
 */
const SeoHead = ({
  title = 'RitzlaNews - Real-time News & Live Coverage',
  description = 'Read breaking investigative news, participate in real-time interactive live blogs, and watch low-latency WebRTC broadcasts.',
  keywords = 'News, Real-time news, Live Blogs, Politics, Sports, Journalism',
  canonical = window.location.href,
  image = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200',
  type = 'website',
  publishedTime = '',
  modifiedTime = '',
  author = 'RitzlaNews Desk',
  schema = null
}) => {
  // Optimize Cloudinary imagery for Google Discover minimum width (1200px)
  let ogImage = image;
  if (ogImage && ogImage.includes('cloudinary.com') && !ogImage.includes('w_1200')) {
    const uploadIndex = ogImage.indexOf('/upload/');
    if (uploadIndex !== -1) {
      ogImage = ogImage.slice(0, uploadIndex + 8) + 'f_auto,q_auto,w_1200,c_fill/' + ogImage.slice(uploadIndex + 8);
    }
  }

  // Clean description string of any Markdown or HTML syntax
  const cleanDescription = description
    ?.toString()
    ?.replace(/<[^>]*>?/gm, '')
    ?.substring(0, 160) || '';

  const schemasToRender = Array.isArray(schema) ? schema : schema ? [schema] : [];

  return (
    <Helmet>
      {/* Primary Page Tags */}
      <title>{title}</title>
      <meta name="description" content={cleanDescription} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook / WhatsApp Cards */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="RitzlaNews" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={cleanDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonical} />

      {/* Article Publication Dates (if applicable) */}
      {type === 'article' && publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {type === 'article' && modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {type === 'article' && author && <meta property="article:author" content={author} />}

      {/* Twitter / X Large Summary Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={cleanDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured JSON-LD Rich Results Schema */}
      {schemasToRender.map((sch, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(sch)}
        </script>
      ))}
    </Helmet>
  );
};

export default React.memo(SeoHead);
