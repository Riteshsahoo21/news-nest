/**
 * Utility to sanitize scraped and aggregated news article content.
 * Strips out extraneous widgets, topic clouds, audio player prompts,
 * photo credit fragments, and normalizes paragraph breaks.
 */

const NOISE_LINE_PATTERNS = [
  /sign up for our newsletter/i,
  /follow us on (twitter|facebook|instagram|x|threads|linkedin)/i,
  /^advertisement$/i,
  /^read more:/i,
  /^also read:/i,
  /^related (stories|articles):/i,
  /^more from/i,
  /copyright \d{4}/i,
  /all rights reserved/i,
  /terms of (service|use)/i,
  /privacy policy/i,
  /^click here to/i,
  /^subscribe to/i,
  /^trending now/i,
  /^sponsored content/i,
  /^share this (story|article)/i,
  /^download the app/i,
  /we use cookies and data/i,
  /if you choose to [‘']?accept all/i,
  /reject all[’']?,? we will not use cookies/i,
  /non-personalized content is influenced by/i,
  /visit g\.co\/privacytools/i,
  /managing your privacy settings/i,
  /cookie (policy|notice|preferences|settings)/i,
  /consent (preferences|manager)/i
];

/**
 * Cleans and formats an article text body into clean, readable paragraphs.
 * @param {string} text - Raw content
 * @returns {string} Cleaned, multi-paragraph text
 */
export const cleanArticleText = (text) => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. If HTML tags are present, convert block tags to newlines before stripping
  if (/<[a-z][\s\S]*>/i.test(cleaned)) {
    cleaned = cleaned
      .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n\n')
      .replace(/<[^>]*>/g, ' ');
  }

  // 2. Strip trailing and inline Topic: clusters (common in scraped news portals)
  cleaned = cleaned.replace(/(\bTopic:[^\n]+\s*)+$/gi, '');
  cleaned = cleaned.replace(/(?:^|\n)Topic:[^\n]+(?:\n|$)/gi, '\n\n');
  cleaned = cleaned.replace(/\bTopic:[A-Za-z0-9&/-]+(?:\s+Topic:[A-Za-z0-9&/-]+)*/gi, '');

  // 3. Strip audio player / paywall announcements
  cleaned = cleaned.replace(/Listen to this article in summarized format\s*Unlock AI Briefing and Premium Content/gi, '');
  cleaned = cleaned.replace(/Listen to this article(?:\s*\(.*?\))?/gi, '');
  cleaned = cleaned.replace(/Unlock AI Briefing(?:\s*and Premium Content)?/gi, '');

  // 4. Strip photo/image credit snippets in parentheses or brackets
  cleaned = cleaned.replace(/\((?:Image|Photo|AP|Reuters|AFP|Getty Images|iStock)[^)]*\)/gi, '');
  cleaned = cleaned.replace(/\[(?:Image|Photo|AP|Reuters|AFP|Getty Images|iStock)[^\]]*\]/gi, '');

  // 5. Clean line-by-line
  const lines = cleaned.split(/\r?\n/);
  const validParagraphs = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check against noise patterns
    const isNoise = NOISE_LINE_PATTERNS.some(pattern => pattern.test(line));
    if (isNoise) continue;

    // Normalize inline spacing
    line = line.replace(/[ \t]+/g, ' ');

    validParagraphs.push(line);
  }

  // 6. Group short fragments into natural paragraphs
  const cohesiveParagraphs = [];
  let current = '';

  for (const para of validParagraphs) {
    // If it's a short heading or bullet
    if (para.length < 80 && !/[.!?]"?$/.test(para)) {
      if (current) {
        cohesiveParagraphs.push(current);
        current = '';
      }
      cohesiveParagraphs.push(para);
    } else {
      if (current) {
        current += ' ' + para;
      } else {
        current = para;
      }

      if (current.length >= 220 || /[.!?]"?$/.test(current)) {
        cohesiveParagraphs.push(current);
        current = '';
      }
    }
  }

  if (current) {
    cohesiveParagraphs.push(current);
  }

  // 7. Join with double newlines
  const result = cohesiveParagraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  if (result.length < 50 || /we use cookies and data/i.test(result) || /privacytools/i.test(result)) {
    return '';
  }
  return result;
};
