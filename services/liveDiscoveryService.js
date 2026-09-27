import { syncMetadataFeeds } from './hybridNewsService.js';
import { normalizeSearchQuery } from '../utils/searchQuery.js';

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const completedDiscoveries = new Map();
const inFlightDiscoveries = new Map();

const clampLimit = (value, fallback = 6) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 8);
};

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of completedDiscoveries.entries()) {
    if (now - entry.completedAt >= CACHE_TTL_MS) completedDiscoveries.delete(key);
  }
  while (completedDiscoveries.size > MAX_CACHE_ENTRIES) {
    const firstKey = completedDiscoveries.keys().next().value;
    completedDiscoveries.delete(firstKey);
  }
};

const runCoalesced = async (key, task) => {
  pruneCache();
  const cached = completedDiscoveries.get(key);
  if (cached) return { ...cached.result, cached: true };

  if (inFlightDiscoveries.has(key)) {
    const result = await inFlightDiscoveries.get(key);
    return { ...result, coalesced: true };
  }

  const promise = task()
    .then((result) => {
      completedDiscoveries.set(key, { completedAt: Date.now(), result });
      return result;
    })
    .finally(() => inFlightDiscoveries.delete(key));

  inFlightDiscoveries.set(key, promise);
  return promise;
};

const triggerCoalesced = (key, task) => {
  pruneCache();
  const cached = completedDiscoveries.get(key);
  if (cached) {
    return {
      attempted: true,
      status: 'complete',
      cached: true,
      acceptedCount: cached.result.acceptedCount || 0,
      insertedCount: cached.result.insertedCount || 0
    };
  }

  if (inFlightDiscoveries.has(key)) {
    return { attempted: true, status: 'running', coalesced: true };
  }

  const promise = task()
    .catch((error) => ({ attempted: true, error: error.message, acceptedCount: 0, insertedCount: 0 }))
    .then((result) => {
      completedDiscoveries.set(key, { completedAt: Date.now(), result });
      return result;
    })
    .finally(() => inFlightDiscoveries.delete(key));
  inFlightDiscoveries.set(key, promise);
  return { attempted: true, status: 'running', started: true };
};

const searchDiscoveryRequest = (query, options = {}) => {
  const limit = clampLimit(options.limit, 6);
  return syncMetadataFeeds({
    query,
    country: options.country,
    language: options.language || 'en',
    limit,
    maxCandidates: Math.max(8, limit * 2)
  });
};

export const discoverSearchNews = async (rawQuery, options = {}) => {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 2) {
    return { attempted: false, reason: 'query-too-short', insertedCount: 0, acceptedCount: 0 };
  }

  const key = `search:${query.toLowerCase()}:${options.country || 'global'}`;
  return runCoalesced(key, async () => ({
    attempted: true,
    ...(await searchDiscoveryRequest(query, options))
  }));
};

export const triggerSearchNewsDiscovery = (rawQuery, options = {}) => {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 2) {
    return { attempted: false, status: 'skipped', reason: 'query-too-short' };
  }

  const key = `search:${query.toLowerCase()}:${options.country || 'global'}`;
  return triggerCoalesced(key, async () => ({
    attempted: true,
    ...(await searchDiscoveryRequest(query, options))
  }));
};

export const discoverLocalNews = async (location = {}, options = {}) => {
  const city = normalizeSearchQuery(location.city || '').slice(0, 100);
  const region = normalizeSearchQuery(location.region || '').slice(0, 100);
  const country = String(location.countryCode || options.country || '').trim().toLowerCase().slice(0, 2);
  const countryName = normalizeSearchQuery(location.country || '');
  const fallbackQuery = !city && !region && countryName.length > 2 ? countryName : '';

  if (!city && !region && !fallbackQuery) {
    return { attempted: false, reason: 'location-too-broad', insertedCount: 0, acceptedCount: 0 };
  }

  const limit = clampLimit(options.limit, 6);
  const key = `local:${country || 'global'}:${region.toLowerCase()}:${city.toLowerCase()}`;
  return runCoalesced(key, async () => ({
    attempted: true,
    ...(await syncMetadataFeeds({
      query: fallbackQuery || undefined,
      city: city || undefined,
      region: region || undefined,
      country: country || undefined,
      language: options.language || 'en',
      limit,
      maxCandidates: Math.max(8, limit * 2)
    }))
  }));
};

export const clearLiveDiscoveryCache = () => {
  completedDiscoveries.clear();
  inFlightDiscoveries.clear();
};
