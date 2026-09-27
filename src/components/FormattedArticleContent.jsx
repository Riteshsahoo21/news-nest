import React from 'react';
import { Quote, BookOpen, Image as ImageIcon } from 'lucide-react';
import SafeImage from './common/SafeImage';

/**
 * Splits text into sentences while protecting common abbreviations and dates (e.g. Sept. 19, Dr. Smith, U.S. Navy)
 */
const splitIntoSentences = (text) => {
  if (!text) return [];
  
  // Protect abbreviations, months, titles, initials, and decimals
  const protectedText = text
    .replace(/(Sept|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./gi, '$1__MONTH__')
    .replace(/(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|Inc|Corp|Ltd|Gov|Capt|Lt|Gen|Col|No)\./gi, '$1__ABBR__')
    .replace(/(\d+)\.(\d+)/g, '$1__DEC__$2')
    .replace(/([A-Z])\.([A-Z])\./g, '$1__DOT__$2__DOT__');

  // Match sentence ending on . ! ? followed by whitespace or end of string
  const rawSentences = protectedText.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [protectedText];

  return rawSentences.map(s => 
    s
      .replace(/__MONTH__/g, '.')
      .replace(/__ABBR__/g, '.')
      .replace(/__DEC__/g, '.')
      .replace(/__DOT__/g, '.')
      .trim()
  ).filter(s => s.length > 0);
};

export default function FormattedArticleContent({ 
  content = '', 
  author = 'Editorial Bureau', 
  mediaUrls = [],
  category = '',
  subCategory = '',
  country = '',
  className = '' 
}) {
  if (!content) return null;

  // 1. Clean and prepare text defensively
  let cleanText = content
    .replace(/(\bTopic:[^\n]+\s*)+$/gi, '')
    .replace(/(?:^|\n)Topic:[^\n]+(?:\n|$)/gi, '\n\n')
    .replace(/Listen to this article in summarized format\s*Unlock AI Briefing and Premium Content/gi, '')
    .replace(/Listen to this article(?:\s*\(.*?\))?/gi, '')
    .replace(/Unlock AI Briefing(?:\s*and Premium Content)?/gi, '')
    .replace(/\((?:Image|Photo|AP|Reuters|AFP|Getty Images|iStock)[^)]*\)/gi, '')
    .replace(/\[(?:Image|Photo|AP|Reuters|AFP|Getty Images|iStock)[^\]]*\]/gi, '');

  const isHtml = /<[a-z][\s\S]*>/i.test(cleanText);
  let paragraphs = [];

  if (isHtml) {
    // Check if it's already well-structured with multiple paragraphs
    const pCount = (cleanText.match(/<p[\s>]/gi) || []).length + (cleanText.match(/<h[2-4][\s>]/gi) || []).length;
    if (pCount > 2 && cleanText.length / pCount < 500) {
      // Well structured HTML: style and render directly with journalism typography
      return (
        <div className={`prose prose-lg sm:prose-xl dark:prose-invert max-w-none font-serif text-foreground/90 leading-[1.85] space-y-6 sm:space-y-7 tracking-[0.01em] ${className}`}>
          <div dangerouslySetInnerHTML={{ __html: cleanText }} />
        </div>
      );
    }
    // Otherwise, strip tags to perform intelligent editorial paragraph division
    cleanText = cleanText.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n').replace(/<[^>]*>?/gm, ' ').trim();
  }

  // 2. Intelligent Paragraph Splitting
  // Try splitting by existing line breaks first
  const rawSegments = cleanText
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.toLowerCase().startsWith('topic:'));

  // If we already have multiple natural paragraphs, preserve them
  if (rawSegments.length >= 3 && rawSegments.every(s => s.length < 800)) {
    paragraphs = rawSegments;
  } else {
    // For massive blocks, split into readable editorial paragraphs using safe sentence splitting
    rawSegments.forEach(seg => {
      if (seg.length > 450) {
        const sentences = splitIntoSentences(seg);
        let currentParagraph = '';
        
        sentences.forEach(sentence => {
          currentParagraph += (currentParagraph ? ' ' : '') + sentence;
          // Start a new paragraph roughly every 3-5 sentences (approx 350-500 chars)
          if (currentParagraph.length >= 380) {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = '';
          }
        });
        if (currentParagraph.trim().length > 0) {
          if (paragraphs.length > 0 && currentParagraph.length < 120) {
            paragraphs[paragraphs.length - 1] += ' ' + currentParagraph.trim();
          } else {
            paragraphs.push(currentParagraph.trim());
          }
        }
      } else {
        paragraphs.push(seg);
      }
    });
  }

  // If after everything we still only have 1 paragraph, do a strict sentence division
  if (paragraphs.length === 1 && paragraphs[0].length > 300) {
    const sentences = splitIntoSentences(paragraphs[0]);
    paragraphs = [];
    let temp = '';
    sentences.forEach((s, idx) => {
      temp += (temp ? ' ' : '') + s;
      if ((idx + 1) % 3 === 0 || idx === sentences.length - 1) {
        paragraphs.push(temp.trim());
        temp = '';
      }
    });
  }

  // 3. Select a dynamic pull quote from the middle paragraphs if article is long enough
  let pullQuote = null;
  let pullQuoteIndex = -1;
  if (paragraphs.length >= 4) {
    const targetIdx = Math.floor(paragraphs.length / 2);
    const candidateText = paragraphs[targetIdx] || paragraphs[1];
    const sentences = splitIntoSentences(candidateText);
    const bestSentence = sentences.find(s => 
      s.length >= 60 && 
      s.length <= 180 && 
      /[.!?]$/.test(s) &&
      !s.toLowerCase().startsWith('for example') &&
      !s.toLowerCase().startsWith('photo') &&
      !s.toLowerCase().startsWith('image') &&
      !s.toLowerCase().includes('http')
    );
    if (bestSentence && bestSentence.length >= 50) {
      pullQuote = bestSentence.trim();
      pullQuoteIndex = targetIdx;
    }
  }

  // Filter in-article media images (skip index 0 if it's used as hero image)
  const inArticleImages = (mediaUrls && mediaUrls.length > 1) 
    ? mediaUrls.slice(1).filter(u => u && u.startsWith('http'))
    : [];

  return (
    <div className={`space-y-7 sm:space-y-8 max-w-none text-foreground/90 font-serif leading-[1.85] tracking-[0.008em] text-base sm:text-lg md:text-xl ${className}`}>
      {paragraphs.map((para, index) => {
        const isFirst = index === 0;
        
        // In-article image slot: insert an image after paragraph 1 and after paragraph 4 if available
        let inlineImage = null;
        if (index === 1 && inArticleImages.length > 0) {
          inlineImage = inArticleImages[0];
        } else if (index === 4 && inArticleImages.length > 1) {
          inlineImage = inArticleImages[1];
        }

        // Extract Drop Cap for the opening paragraph if it begins with an alphabetical letter
        const firstLetter = para.charAt(0);
        const shouldDropCap = isFirst && para.length > 30 && /^[a-zA-Z]$/.test(firstLetter);

        if (shouldDropCap) {
          const restOfParagraph = para.slice(1);

          return (
            <p key={index} className="relative font-serif text-foreground/95 leading-[1.85] pb-2">
              <span className="float-left text-5xl sm:text-6xl md:text-[68px] font-black font-serif mr-3 sm:mr-3.5 mb-1 mt-0.5 text-red-600 dark:text-red-500 leading-none select-none font-mono uppercase border-r-2 border-red-600/30 pr-3">
                {firstLetter}
              </span>
              {restOfParagraph}
            </p>
          );
        }

        return (
          <React.Fragment key={index}>
            {/* Insert Editorial Pull Quote in the middle of reading flow */}
            {index === pullQuoteIndex && pullQuote && (
              <aside className="my-6 sm:my-10 p-5 sm:p-8 bg-gradient-to-r from-red-600/5 via-card to-muted/20 border-l-4 border-red-600 rounded-r-2xl shadow-sm relative overflow-hidden not-prose font-serif w-full max-w-full min-w-0">
                <Quote className="absolute right-4 top-4 w-16 h-16 text-red-600/10 pointer-events-none transform rotate-180" />
                <div className="flex items-center gap-2 text-[11px] font-extrabold font-mono text-red-600 uppercase tracking-widest mb-3">
                  <BookOpen className="w-3.5 h-3.5" /> Key Insight • Editorial Highlight
                </div>
                <blockquote className="text-xl sm:text-2xl font-bold font-serif italic text-foreground leading-snug tracking-tight mb-3">
                  "{pullQuote}"
                </blockquote>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  — {author || 'News Nests Investigation'}
                </p>
              </aside>
            )}

            <p className="text-foreground/90 leading-[1.85]">
              {para}
            </p>

            {/* In-article contextual photograph */}
            {inlineImage && (
              <figure className="my-8 sm:my-10 rounded-2xl overflow-hidden shadow-lg border border-border/50 not-prose">
                <SafeImage
                  src={inlineImage}
                  alt={`Article photo - paragraph ${index + 1}`}
                  category={category}
                  subCategory={subCategory}
                  country={country}
                  className="w-full max-h-[460px] object-cover"
                />
                <figcaption className="p-3 bg-muted/40 text-xs font-mono text-muted-foreground text-center flex items-center justify-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> In-depth coverage photography
                </figcaption>
              </figure>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
