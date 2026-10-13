import mongoose from 'mongoose';
import News from '../models/News.js';

/**
 * Universal Multi-Tier Recommendation Engine (Zero-Token Industrial Architecture)
 * 
 * Stage 1: Candidate Retrieval (Fast Inverted Index via MongoDB compound text + category)
 * Stage 2: Heavy Multi-Signal Ranking (Exact Entities + Tags + Domain alignment + Recency Decay)
 * Stage 3: Re-ranking, Deduplication & Diversity Filtering
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'from', 'up', 'down', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
  'will', 'just', 'don', 'should', 'now', 'is', 'am', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
  'doing', 'say', 'says', 'said', 'new', 'urges', 'told', 'tells', 'ahead'
]);

/**
 * Extract high-value entities and keywords from text
 * Identifies proper nouns, acronyms, brand names, player names, and technical terms
 */
export const extractSalientEntities = (title = '', tags = [], summary = '') => {
  const entitySet = new Set();

  // 1. Include explicit tags (always high-value anchors)
  if (Array.isArray(tags)) {
    tags.forEach(t => {
      const clean = String(t || '').trim().toLowerCase();
      if (clean && clean.length > 2 && !STOP_WORDS.has(clean)) {
        entitySet.add(clean);
      }
    });
  }

  // 2. Extract capitalized proper nouns / multi-word entities from title
  // e.g. "Ganga Hospital", "Miracle-", "SK Rossi", "Pulicat", "INSAT-4G", "Dota 2"
  const cleanTitle = String(title || '').trim();
  
  // Find capitalized word sequences (e.g. "Pulicat", "Ganga Hospital", "Riyadh Masters")
  const properNounRegex = /\b[A-Z][a-zA-Z0-9\-_]+(?:\s+[A-Z][a-zA-Z0-9\-_]+)*\b/g;
  let match;
  while ((match = properNounRegex.exec(cleanTitle)) !== null) {
    const phrase = match[0].trim().toLowerCase();
    if (phrase.length > 2 && !STOP_WORDS.has(phrase)) {
      entitySet.add(phrase);
    }
  }

  // 3. Extract alphanumeric model/gear terms (e.g. "G Pro X", "RTX 5090", "INSAT-4G")
  const codeNameRegex = /\b[A-Za-z]+[-_0-9]+[A-Za-z0-9-_]*\b/g;
  while ((match = codeNameRegex.exec(cleanTitle)) !== null) {
    const code = match[0].trim().toLowerCase();
    if (code.length > 2) {
      entitySet.add(code);
    }
  }

  // 4. Fallback: Important individual words from title
  const words = cleanTitle.toLowerCase().split(/[^a-z0-9\-_]+/);
  words.forEach(w => {
    if (w.length > 3 && !STOP_WORDS.has(w)) {
      entitySet.add(w);
    }
  });

  return Array.from(entitySet);
};

/**
 * Calculates Jaccard token similarity between two titles to prevent duplicate echoing
 */
export const calculateHeadlineSimilarity = (titleA = '', titleB = '') => {
  const getTokens = (t) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)));
  const setA = getTokens(titleA);
  const setB = getTokens(titleB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
};

/**
 * Finds the top related news articles using the 3-Stage Multi-Tier Architecture
 * @param {Object} seedArticle - The reference article (with title, tags, category, etc.)
 * @param {Object} options - { limit: 3, excludeIds: [], persistCache: true }
 */
export const findRelatedNewsMultiTier = async (seedArticle, options = {}) => {
  const limit = Math.max(1, Math.min(options.limit || 3, 10));
  const excludeIds = (options.excludeIds || []).map(id => String(id));
  if (seedArticle._id) excludeIds.push(String(seedArticle._id));

  // --- STAGE 1: CANDIDATE RETRIEVAL (<5ms) ---
  const entities = extractSalientEntities(
    seedArticle.title,
    seedArticle.tags,
    seedArticle.subtitle || seedArticle.summary
  );

  const queryTags = Array.isArray(seedArticle.tags)
    ? seedArticle.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
    : [];

  const candidateFilter = {
    status: 'approved',
    _id: { $nin: excludeIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id)) }
  };

  // Build high-efficiency search terms for Stage 1 retrieval
  const searchTerms = entities.slice(0, 8).join(' ');
  let candidates = [];

  // 1. Text index match if search terms exist
  if (searchTerms) {
    try {
      candidates = await News.find(
        { ...candidateFilter, $text: { $search: searchTerms } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(40)
        .select('title slug subtitle summary imageUrl mainImageUrl category subCategory tags publishedAt createdAt')
        .lean();
    } catch (err) {
      candidates = [];
    }
  }

  // If text query yielded fewer than 15 candidates, supplement with tag and category candidates
  if (candidates.length < 15) {
    const existingIds = new Set(candidates.map(c => String(c._id)));
    const supplementFilter = {
      ...candidateFilter,
      _id: {
        $nin: [
          ...candidateFilter._id.$nin,
          ...Array.from(existingIds).filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id))
        ]
      }
    };

    if (queryTags.length > 0) {
      supplementFilter.tags = { $in: queryTags };
    } else if (seedArticle.category) {
      supplementFilter.category = seedArticle.category.toLowerCase();
    }

    const more = await News.find(supplementFilter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(30 - candidates.length)
      .select('title slug subtitle summary imageUrl mainImageUrl category subCategory tags publishedAt createdAt')
      .lean();

    candidates = [...candidates, ...more];
  }

  if (candidates.length === 0) {
    return [];
  }

  // --- STAGE 2: HEAVY MULTI-SIGNAL RANKING ---
  const seedEntitiesLower = new Set(entities.map(e => e.toLowerCase()));
  const seedTitleLower = (seedArticle.title || '').toLowerCase();
  const seedTagsSet = new Set(queryTags);
  const seedCategory = (seedArticle.category || '').toLowerCase();
  const seedSubCategory = (seedArticle.subCategory || '').toLowerCase();
  const now = Date.now();

  const scoredCandidates = candidates.map(candidate => {
    let score = 0;
    const candTitleLower = (candidate.title || '').toLowerCase();
    const candTags = Array.isArray(candidate.tags) ? candidate.tags.map(t => String(t).toLowerCase()) : [];
    const candCategory = (candidate.category || '').toLowerCase();
    const candSubCategory = (candidate.subCategory || '').toLowerCase();

    // 1. Exact Entity Matches (High precision proper nouns / gear / names / places)
    let matchedEntityCount = 0;
    for (const entity of seedEntitiesLower) {
      if (candTitleLower.includes(entity) || candTags.includes(entity)) {
        matchedEntityCount++;
        // Give higher weight to multi-word entities (e.g. "Ganga Hospital", "Riyadh Masters", "Logitech G Pro")
        const entityWeight = entity.includes(' ') ? 80 : 45;
        score += entityWeight;
      }
    }

    // 2. Tag Jaccard Overlap
    let matchedTagCount = 0;
    candTags.forEach(t => {
      if (seedTagsSet.has(t)) {
        matchedTagCount++;
        score += 35;
      }
    });

    // 3. SubCategory Alignment (e.g. Esports, Cricket, Cardiology)
    if (seedSubCategory && candSubCategory && seedSubCategory === candSubCategory) {
      score += 30;
    }

    // 4. Category Alignment
    if (seedCategory && candCategory && seedCategory === candCategory) {
      score += 15;
    } else if (seedCategory && candCategory && seedCategory !== candCategory) {
      // Cross-category penalty if neither tags nor entities match
      if (matchedEntityCount === 0 && matchedTagCount === 0) {
        score -= 50;
      }
    }

    // 5. MongoDB Text Score Component (if available)
    if (candidate.score && typeof candidate.score === 'number') {
      score += Math.min(candidate.score * 2, 40);
    }

    // 6. Recency Decay (Fresh news within 72h gets a boost; gracefully decays up to 30 days)
    const pubDate = candidate.publishedAt ? new Date(candidate.publishedAt).getTime() : 0;
    if (pubDate > 0) {
      const ageHours = Math.max(0, (now - pubDate) / (1000 * 60 * 60));
      if (ageHours <= 48) {
        score += 25;
      } else if (ageHours <= 168) { // 7 days
        score += 15;
      } else if (ageHours <= 720) { // 30 days
        score += 5;
      }
    }

    return {
      ...candidate,
      _affinityScore: score,
      _headlineSimilarityToSeed: calculateHeadlineSimilarity(seedTitleLower, candTitleLower)
    };
  });

  // --- STAGE 3: RE-RANKING, DEDUPLICATION & DIVERSITY FILTER ---
  // Filter out near-duplicate headlines (>85% identical word overlap, e.g. syndicated wire copies)
  const filtered = scoredCandidates.filter(c => c._headlineSimilarityToSeed < 0.85);

  // Sort by final multi-tier affinity score descending
  filtered.sort((a, b) => b._affinityScore - a._affinityScore);

  // Take top N diverse results
  const finalResults = filtered.slice(0, limit);

  // Auto-cache the resolved companion IDs on the article in MongoDB
  if (options.persistCache !== false && seedArticle._id && mongoose.isValidObjectId(seedArticle._id) && finalResults.length > 0) {
    const relatedIds = finalResults.map(r => r._id);
    News.findByIdAndUpdate(seedArticle._id, { $set: { relatedArticles: relatedIds } })
      .catch(err => console.error('Failed to auto-cache related articles:', err.message));
  }

  return finalResults;
};

export default {
  extractSalientEntities,
  calculateHeadlineSimilarity,
  findRelatedNewsMultiTier
};
