/**
 * Generates an SEO-friendly, concise semantic URL slug from a headline or title.
 * Automatically strips noisy stop words and limits length to 6-7 high-impact keyword terms (~55 characters)
 * before appending the last 6 characters of the MongoDB document ID for collision immunity.
 * 
 * @param {string} title - The news article or live blog title
 * @param {string|object} [id] - Optional document ID for uniqueness
 * @returns {string} - Computed concise keyword slug (e.g., "xabi-alonso-confirms-chelsea-midfielder-5cd15d")
 */
export const createSlug = (title, id = '') => {
  if (!title && !id) return `article-${Math.random().toString(36).substring(2, 8)}`;
  
  const rawText = (title || 'news-coverage').toString().toLowerCase().trim();
  
  // Clean special characters and tokenize into individual words
  const words = rawText
    .replace(/[^\w\s\-]+/g, '') // Remove all non-word chars except spaces/hyphens
    .split(/\s+|-+/)            // Split by whitespace or existing hyphens
    .filter(Boolean);

  // Strip common filler and stop words to maximize keyword density for Google News SEO
  const stopWords = new Set([
    'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 
    'was', 'were', 'by', 'with', 'from', 'as', 'about', 'after', 'before', 
    'and', 'or', 'nor', 'but', 'so', 'yet', 'has', 'have', 'had'
  ]);
  
  const keywordWords = words.filter(w => !stopWords.has(w));
  const targetWords = keywordWords.length > 0 ? keywordWords : words;

  // Take the first 6-7 words up to a generous maximum of ~50 characters
  const conciseWords = [];
  let totalLength = 0;
  for (const word of targetWords) {
    if (conciseWords.length >= 6 || (totalLength + word.length > 50 && conciseWords.length >= 3)) {
      break;
    }
    conciseWords.push(word);
    totalLength += word.length + 1;
  }

  const baseSlug = conciseWords.join('-') || 'news-story';

  if (id) {
    const suffix = id.toString().slice(-6);
    return `${baseSlug}-${suffix}`;
  }

  const randomHash = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomHash}`;
};
