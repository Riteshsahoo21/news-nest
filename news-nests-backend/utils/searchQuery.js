const MAX_SEARCH_LENGTH = 160;
const MAX_SEARCH_TERMS = 10;

export const escapeRegExp = (value = '') => (
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

export const buildLiteralSearchRegex = (value = '') => {
  const escaped = escapeRegExp(value);
  const startsWithWordCharacter = /^[\p{L}\p{M}\p{N}_]/u.test(value);
  const endsWithWordCharacter = /[\p{L}\p{M}\p{N}_]$/u.test(value);
  const prefix = startsWithWordCharacter ? '(?<![\\p{L}\\p{M}\\p{N}_])' : '';
  const suffix = endsWithWordCharacter ? '(?![\\p{L}\\p{M}\\p{N}_])' : '';
  return new RegExp(`${prefix}${escaped}${suffix}`, 'iu');
};

export const normalizeSearchQuery = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_SEARCH_LENGTH);
};

export const tokenizeSearchQuery = (value) => {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) return [];

  const terms = [];
  const matcher = /"([^"]+)"|(\S+)/g;
  let match;

  while ((match = matcher.exec(normalized)) && terms.length < MAX_SEARCH_TERMS) {
    const term = (match[1] || match[2] || '').trim();
    if (term && !terms.some((existing) => existing.toLowerCase() === term.toLowerCase())) {
      terms.push(term);
    }
  }

  return terms;
};

/**
 * Builds an AND-of-terms query. Each term may occur in any searchable field,
 * so "climate policy" cannot accidentally match an article containing only
 * one of the requested words. Quoted phrases remain a single exact phrase.
 */
export const buildSearchFilter = (value, fields) => {
  const terms = tokenizeSearchQuery(value);
  if (terms.length === 0) return null;

  return {
    $and: terms.map((term) => {
      const regex = buildLiteralSearchRegex(term);
      return {
        $or: fields.map((field) => ({ [field]: { $regex: regex } }))
      };
    })
  };
};

export const parsePagination = (query = {}, defaults = {}) => {
  const defaultLimit = defaults.limit || 24;
  const maxLimit = defaults.maxLimit || 100;
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, maxLimit)
    : defaultLimit;

  return { page, limit, skip: (page - 1) * limit };
};
