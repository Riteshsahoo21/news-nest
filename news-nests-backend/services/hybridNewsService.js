import axios from 'axios';
import mongoose from 'mongoose';
import News from '../models/News.js';
import { createSlug } from '../utils/slugify.js';
import { generateTags } from '../utils/tagGenerator.js';
import { getCategoryFallbackImage } from './imageFallbacks.js';
import { cleanArticleText } from '../utils/contentSanitizer.js';
import { notifyArticleApprovedInBackground } from './automationWebhookService.js';

const FASTAPI_SCRAPER_URL = process.env.FASTAPI_SCRAPER_URL || 'http://127.0.0.1:8000';
const MIN_COMPLETE_CONTENT_LENGTH = 350;
const DEFAULT_EXTRACTION_CONCURRENCY = 4;

const clampInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const EXTRACTION_CONCURRENCY = clampInteger(
  process.env.SCRAPER_EXTRACTION_CONCURRENCY,
  DEFAULT_EXTRACTION_CONCURRENCY,
  1,
  8
);

const isHttpUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const toValidDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const selectRichestContent = (...values) => values
  .map((value) => cleanArticleText(value || ''))
  .filter(Boolean)
  .sort((left, right) => right.length - left.length)[0] || '';

export const isCompleteScrapedArticle = (article) => {
  if (!article) return false;
  const content = cleanArticleText(article.content || '');
  const mediaUrls = Array.isArray(article.mediaUrls) ? article.mediaUrls.filter(isHttpUrl) : [];
  const hasImage = isHttpUrl(article.mainImageUrl) || isHttpUrl(article.imageUrl) || mediaUrls.length > 0;
  const takeaways = Array.isArray(article.keyTakeaways)
    ? article.keyTakeaways.filter((item) => typeof item === 'string' && item.trim())
    : [];

  return Boolean(
    article.isFullContentFetched &&
    content.length >= MIN_COMPLETE_CONTENT_LENGTH &&
    isHttpUrl(article.sourceUrl) &&
    typeof article.sourceName === 'string' && article.sourceName.trim() &&
    typeof article.author === 'string' && article.author.trim() &&
    hasImage &&
    mediaUrls.length > 0 &&
    toValidDate(article.publishedAt) &&
    typeof article.aiSummary === 'string' && article.aiSummary.trim().length >= 40 &&
    takeaways.length > 0
  );
};

const extractCompleteArticle = async (article, { timeoutMs = 45000 } = {}) => {
  if (!article?.title || !isHttpUrl(article.sourceUrl) || !article.sourceName) {
    return { article: null, reason: 'missing source metadata' };
  }

  try {
    const response = await axios.post(`${FASTAPI_SCRAPER_URL}/api/news/extract-url`, {
      url: article.sourceUrl,
      title: article.title,
      category: article.category,
      subCategory: article.subCategory,
      country: article.country,
      imageUrl: article.imageUrl,
      fallbackContent: selectRichestContent(article.content, article.summary)
    }, { timeout: timeoutMs });

    const extracted = response.data || {};
    const content = selectRichestContent(extracted.content, article.content, article.summary);
    const imageUrl = extracted.imageUrl || article.imageUrl || getCategoryFallbackImage(
      article.category,
      article.subCategory,
      article.country
    );
    const mediaUrls = Array.from(new Set([
      ...(Array.isArray(extracted.mediaUrls) ? extracted.mediaUrls : []),
      ...(Array.isArray(article.mediaUrls) ? article.mediaUrls : []),
      imageUrl
    ].filter(isHttpUrl)));
    const publishedAt = toValidDate(extracted.publishedAt || article.publishedAt);
    const sourceName = String(article.sourceName || '').trim();
    const extractedAuthor = String(extracted.author || '').trim();
    const author = extractedAuthor && extractedAuthor !== 'News Desk' ? extractedAuthor : sourceName;
    const aiSummary = cleanArticleText(extracted.aiSummary || '');
    const keyTakeaways = Array.isArray(extracted.keyTakeaways)
      ? extracted.keyTakeaways.map((item) => cleanArticleText(item)).filter(Boolean).slice(0, 5)
      : [];
    const tags = Array.from(new Set([
      ...(Array.isArray(extracted.tags) ? extracted.tags : []),
      ...generateTags(article.title, content, article.category)
    ].map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))).slice(0, 12);
    const locationText = `${article.title || ''} ${article.summary || ''} ${content}`.toLocaleLowerCase();
    const requestedCity = String(article.city || '').trim();
    const requestedRegion = String(article.region || '').trim();
    const resolvedCity = requestedCity && locationText.includes(requestedCity.toLocaleLowerCase())
      ? requestedCity
      : '';
    const resolvedRegion = requestedRegion && locationText.includes(requestedRegion.toLocaleLowerCase())
      ? requestedRegion
      : '';

    const completeArticle = {
      title: cleanArticleText(article.title),
      subtitle: cleanArticleText(article.summary || '').slice(0, 500),
      content,
      category: String(article.category || '').toLowerCase(),
      subCategory: article.subCategory || 'general',
      country: article.country || 'global',
      region: resolvedRegion,
      city: resolvedCity,
      discoveryProvider: article.discoveryProvider || 'curated-rss',
      language: article.language || 'en',
      sourceName,
      sourceUrl: article.sourceUrl.trim(),
      author,
      imageUrl,
      mainImageUrl: imageUrl,
      mediaUrls,
      publishedAt,
      readTime: extracted.readTime || Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
      aiSummary,
      keyTakeaways,
      tags,
      metaDescription: aiSummary.slice(0, 300),
      seoTitle: cleanArticleText(article.title).slice(0, 120),
      isFeaturedOnHome: article.isFeaturedOnHome ?? true,
      isFullContentFetched: content.length >= MIN_COMPLETE_CONTENT_LENGTH,
      status: 'approved',
      isTrending: true,
      isEditorPick: false
    };

    if (!isCompleteScrapedArticle(completeArticle)) {
      return { article: null, reason: 'scraped result did not meet completeness threshold' };
    }

    return { article: completeArticle, reason: '' };
  } catch (error) {
    return { article: null, reason: error?.response?.data?.detail || error.message };
  }
};

/**
 * Synchronizes fresh metadata from the FastAPI Scraper microservice into MongoDB.
 */
export const syncMetadataFeeds = async (options = {}) => {
  const {
    category,
    subCategory,
    country,
    language,
    isFeaturedOnHome,
    query,
    city,
    region,
    limit = 20
  } = options;

  try {
    const targetLimit = clampInteger(limit, 20, 1, 30);
    const isLiveDiscovery = Boolean(query || city || region);
    // Over-fetch lightweight metadata so duplicates or blocked publisher pages
    // do not prevent a category from reaching its complete-article quota.
    const metadataLimit = Math.min(100, Math.max(targetLimit * 3, targetLimit + 12));
    const params = { limit: metadataLimit };
    if (category && category !== 'all') params.category = category;
    if (subCategory && subCategory !== 'all') params.subCategory = subCategory;
    if (country && country !== 'all') params.country = country;
    if (language) params.language = language;
    if (typeof isFeaturedOnHome === 'boolean') params.isFeaturedOnHome = isFeaturedOnHome;
    if (query) params.q = String(query).trim().slice(0, 160);
    if (city) params.city = String(city).trim().slice(0, 100);
    if (region) params.region = String(region).trim().slice(0, 100);

    const endpoint = isLiveDiscovery ? '/api/news/discover' : '/api/news/metadata-feed';
    const response = await axios.get(`${FASTAPI_SCRAPER_URL}${endpoint}`, {
      params,
      timeout: isLiveDiscovery ? 35000 : 25000
    });

    const articles = response.data?.articles || [];
    let insertedCount = 0;
    let updatedCount = 0;
    let rejectedCount = 0;
    let skippedCompleteCount = 0;
    let acceptedCount = 0;

    const validMetadata = articles.filter((article) => (
      article?.title?.trim().length >= 10 &&
      isHttpUrl(article.sourceUrl) &&
      article.sourceName?.trim()
    ));
    const titles = validMetadata.map((article) => article.title.trim());
    const sourceUrls = validMetadata.map((article) => article.sourceUrl.trim());
    const existingDocs = titles.length > 0
      ? await News.find({ $or: [{ title: { $in: titles } }, { sourceUrl: { $in: sourceUrls } }] })
      : [];
    const existingByTitle = new Map(existingDocs.map((doc) => [doc.title, doc]));
    const existingByUrl = new Map(existingDocs.filter((doc) => doc.sourceUrl).map((doc) => [doc.sourceUrl, doc]));

    const candidates = [];
    for (const article of validMetadata) {
      const cleanTitle = article.title.trim();
      const sourceUrl = article.sourceUrl.trim();
      const existing = existingByUrl.get(sourceUrl) || existingByTitle.get(cleanTitle) || null;
      if (existing && isCompleteScrapedArticle(existing)) {
        skippedCompleteCount++;
        continue;
      }
      candidates.push({ metadata: article, existing });
    }

    // For live search/location discovery: Save lightweight metadata records in parallel so search results appear in ~1.5s!
    if (isLiveDiscovery && candidates.length > 0) {
      const docsToInsert = [];
      for (const { metadata: article, existing } of candidates) {
        if (!existing) {
          const objectId = new mongoose.Types.ObjectId();
          const cleanTitle = article.title.trim();
          const cleanContent = selectRichestContent(article.content, article.summary, cleanTitle);
          const rawImg = typeof article.imageUrl === 'string' ? article.imageUrl.trim() : '';
          const isUnsplash = rawImg.includes('unsplash.com');
          const imageUrl = isUnsplash ? '' : rawImg;

          docsToInsert.push({
            _id: objectId,
            title: cleanTitle,
            slug: createSlug(cleanTitle, objectId),
            summary: article.summary || article.content || '',
            content: cleanContent,
            sourceUrl: article.sourceUrl,
            sourceName: String(article.sourceName || 'Web News').trim(),
            author: String(article.author || article.sourceName || 'News Bureau').trim(),
            imageUrl: imageUrl,
            mainImageUrl: imageUrl,
            mediaUrls: imageUrl ? [imageUrl] : [],
            category: String(article.category || 'general').toLowerCase(),
            subCategory: String(article.subCategory || '').toLowerCase(),
            country: String(article.country || 'all').toLowerCase(),
            publishedAt: toValidDate(article.publishedAt) || new Date(),
            status: 'approved',
            isFullContentFetched: false,
            tags: generateTags(cleanTitle, cleanContent, article.category),
            views: Math.floor(Math.random() * 50) + 15
          });
        }
      }

      if (docsToInsert.length > 0) {
        try {
          const inserted = await News.insertMany(docsToInsert, { ordered: false });
          insertedCount = inserted.length;
          acceptedCount = inserted.length;
          for (const item of inserted) {
            if (item?.status === 'approved') {
              notifyArticleApprovedInBackground(item);
            }
          }
        } catch (insertErr) {
          if (Array.isArray(insertErr?.insertedDocs)) {
            insertedCount = insertErr.insertedDocs.length;
            acceptedCount = insertErr.insertedDocs.length;
          }
        }
        if (insertedCount > 0) {
          return {
            category: category || 'all',
            insertedCount,
            updatedCount,
            skippedCompleteCount,
            acceptedCount
          };
        }
      }
    }

    const maximumCandidates = clampInteger(
      options.maxCandidates,
      isLiveDiscovery ? 12 : 100,
      EXTRACTION_CONCURRENCY,
      100
    );
    const extractionCandidates = candidates.slice(0, maximumCandidates);
    const extractionTimeoutMs = isLiveDiscovery ? 18000 : 45000;
    for (let index = 0; index < extractionCandidates.length && acceptedCount < targetLimit; index += EXTRACTION_CONCURRENCY) {
      const batch = extractionCandidates.slice(index, index + EXTRACTION_CONCURRENCY);
      const results = await Promise.all(batch.map(({ metadata }) => (
        extractCompleteArticle(metadata, { timeoutMs: extractionTimeoutMs })
      )));

      for (let resultIndex = 0; resultIndex < results.length && acceptedCount < targetLimit; resultIndex++) {
        const result = results[resultIndex];
        const existing = batch[resultIndex].existing;
        if (!result.article) {
          rejectedCount++;
          continue;
        }

        if (result.article.subCategory === 'esports' && !result.article.tags.includes('esports')) {
          result.article.tags.unshift('esports');
        }

        if (existing) {
          await News.updateOne({ _id: existing._id }, { $set: result.article });
          updatedCount++;
        } else {
          const objectId = new mongoose.Types.ObjectId();
          try {
            const createdDoc = await News.create({
              ...result.article,
              _id: objectId,
              slug: createSlug(result.article.title, objectId),
              views: Math.floor(Math.random() * 80) + 20
            });
            insertedCount++;
            if (createdDoc?.status === 'approved') {
              notifyArticleApprovedInBackground(createdDoc);
            }
          } catch (error) {
            if (error?.code === 11000) {
              skippedCompleteCount++;
              continue;
            }
            throw error;
          }
        }
        acceptedCount++;
      }
    }

    console.log(
      `[HybridNewsService] Stored ${insertedCount} new and repaired ${updatedCount} complete articles ` +
      `(rejected: ${rejectedCount}, already complete: ${skippedCompleteCount}, ` +
      `category: ${category || 'all'}, country: ${country || 'all'}, query: ${query || 'scheduled'})`
    );
    return {
      insertedCount,
      updatedCount,
      rejectedCount,
      skippedCompleteCount,
      totalFetched: articles.length,
      acceptedCount,
      discoveryProviders: response.data?.providers || []
    };
  } catch (error) {
    console.error('[HybridNewsService] Error syncing metadata feeds:', error?.response?.data || error.message);
    return { insertedCount: 0, error: error.message };
  }
};

/**
 * Periodically syncs across all categories, country feeds, and esports.
 */
export const syncAllCategories = async (limitPerFeed = 5) => {
  console.log('[HybridNewsService] Starting comprehensive multi-region news sync...');
  const categories = ['technology', 'business', 'world', 'sports', 'science', 'health', 'entertainment', 'politics', 'lifestyle'];
  
  let totalInserted = 0;

  // 1. Sync Standard Global/US Categories
  for (const cat of categories) {
    const res = await syncMetadataFeeds({ category: cat, limit: limitPerFeed });
    totalInserted += res.insertedCount || 0;
  }

  // 2. Sync Dedicated Esports Feed
  const esportsRes = await syncMetadataFeeds({ subCategory: 'esports', limit: limitPerFeed });
  totalInserted += esportsRes.insertedCount || 0;

  // 3. Sync India National & Regional (English + Hindi)
  const indiaRes = await syncMetadataFeeds({ country: 'in', limit: limitPerFeed });
  totalInserted += indiaRes.insertedCount || 0;

  console.log(`[HybridNewsService] Comprehensive sync finished. Total new articles inserted: ${totalInserted}`);
  return { totalInserted };
};

/**
 * Fetches the full detailed article body and AI summary from the FastAPI service
 * if it hasn't been fetched yet.
 */
export const getFullArticleContent = async (articleDoc) => {
  if (!articleDoc) return articleDoc;

  // Only skip if already fetched with rich content (>= 700 chars), AI takeaways, and media
  if (
    articleDoc.isFullContentFetched && 
    articleDoc.content && 
    articleDoc.content.length >= 700 && 
    articleDoc.keyTakeaways?.length > 0 &&
    articleDoc.mediaUrls?.length > 0
  ) {
    return articleDoc;
  }

  // If there's no external URL (e.g. native reporter article), return as-is
  if (!articleDoc.sourceUrl) {
    return articleDoc;
  }

  try {
    console.log(`[HybridNewsService] On-demand full-text scrape for: "${articleDoc.title}"`);
    const response = await axios.post(`${FASTAPI_SCRAPER_URL}/api/news/extract-url`, {
      url: articleDoc.sourceUrl,
      title: articleDoc.title,
      category: articleDoc.category,
      subCategory: articleDoc.subCategory,
      country: articleDoc.country,
      imageUrl: articleDoc.imageUrl,
      fallbackContent: articleDoc.content
    }, { timeout: 30000 });

    const extracted = response.data;
    if (extracted && extracted.content && extracted.content.length > 100) {
      const extractedBody = cleanArticleText(extracted.content);
      const existingBody = cleanArticleText(articleDoc.content || '');
      const cleanedBody = extractedBody.length >= existingBody.length ? extractedBody : existingBody;
      if (cleanedBody.length >= 100) {
        const mediaList = Array.from(new Set(
          (Array.isArray(extracted.mediaUrls) ? extracted.mediaUrls : []).filter(Boolean)
        ));
        const resolvedImg = extracted.imageUrl || mediaList[0] || articleDoc.imageUrl || getCategoryFallbackImage(articleDoc.category, articleDoc.subCategory, articleDoc.country);
        
        const updates = {
          content: cleanedBody,
          author: (extracted.author && extracted.author !== 'News Desk') ? extracted.author : (articleDoc.author || articleDoc.sourceName),
          readTime: extracted.readTime || articleDoc.readTime,
          aiSummary: extracted.aiSummary || articleDoc.aiSummary || '',
          keyTakeaways: (extracted.keyTakeaways && extracted.keyTakeaways.length > 0) ? extracted.keyTakeaways : (articleDoc.keyTakeaways || []),
          isFullContentFetched: Boolean(cleanedBody.length >= 350),
          imageUrl: resolvedImg,
          mainImageUrl: resolvedImg,
          mediaUrls: mediaList.length > 0 ? mediaList : (articleDoc.mediaUrls?.length > 0 ? articleDoc.mediaUrls : [resolvedImg].filter(Boolean))
        };

        if (!articleDoc.publishedAt) {
          const extractedPublishedAt = toValidDate(extracted.publishedAt);
          if (extractedPublishedAt) updates.publishedAt = extractedPublishedAt;
        }

        if (extracted.tags && extracted.tags.length > 0) {
          const combined = Array.from(new Set([...(articleDoc.tags || []), ...extracted.tags]));
          updates.tags = combined;
        }

        const updatedArticle = await News.findByIdAndUpdate(
          articleDoc._id,
          { $set: updates },
          { returnDocument: 'after' }
        ).populate('likes', 'fullName');

        console.log(`[HybridNewsService] Successfully cached full content (${cleanedBody.length} chars, ${mediaList.length} media images) and AI summary.`);
        return updatedArticle || articleDoc;
      }
    }
  } catch (err) {
    console.warn(`[HybridNewsService] On-demand scrape failed for ${articleDoc.sourceUrl}:`, err.message);
  }

  return articleDoc;
};
