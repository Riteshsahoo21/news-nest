const MAX_SEARCH_LENGTH = 160;
const MAX_SEARCH_TERMS = 10;

export const escapeRegExp = (value = '') => (
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

export const KNOWN_ENTITIES = [
  { canonical: 'carry minati', aliases: ['carry minati', 'carryminati', 'ajey nagar'] },
  { canonical: 'fukra insaan', aliases: ['fukra insaan', 'fukrainsaan', 'fkura insaan', 'abhishek malhan'] },
  { canonical: 'skrossi', aliases: ['skrossi', 'sk rossi', 'sk-rossi', 'ganesh gangadhar'] },
  { canonical: 'motu patlu', aliases: ['motu patlu', 'motupatlu'] },
  { canonical: 'shubman gill', aliases: ['shubman gill', 'shubmangill'] },
  { canonical: 'virat kohli', aliases: ['virat kohli', 'viratkohli'] },
  { canonical: 'rohit sharma', aliases: ['rohit sharma', 'rohitsharma'] },
  { canonical: 'valorant', aliases: ['valorant', 'valorent'] },
  { canonical: 'narendra modi', aliases: ['narendra modi', 'pm modi', 'modi'] },
  { canonical: 'donald trump', aliases: ['donald trump', 'trump'] },
];

export const levenshteinDistance = (a = '', b = '') => {
  if (a.length < b.length) return levenshteinDistance(b, a);
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const insert = prev[j + 1] + 1;
      const del = curr[j] + 1;
      const sub = prev[j] + (a[i] === b[j] ? 0 : 1);
      curr.push(Math.min(insert, del, sub));
    }
    prev = curr;
  }
  return prev[b.length];
};

export const findClosestQueryCorrection = (query) => {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();

  // If already an exact recognized alias, no typo correction needed
  for (const item of KNOWN_ENTITIES) {
    if (item.aliases.includes(q) || item.canonical === q) {
      return null;
    }
  }

  let bestMatch = null;
  let minDistance = Infinity;

  for (const item of KNOWN_ENTITIES) {
    for (const alias of item.aliases) {
      const d = levenshteinDistance(q, alias);
      const maxAllowed = Math.min(2, Math.max(1, Math.floor(alias.length / 3)));
      if (d > 0 && d <= maxAllowed && d < minDistance) {
        minDistance = d;
        bestMatch = item.canonical;
      }
    }
  }

  // Also check individual words in multi-word queries (e.g. 'arry minati' -> 'carry minati')
  if (!bestMatch && q.includes(' ')) {
    const words = q.split(/\s+/);
    let correctedWords = [...words];
    let changed = false;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const w = words[wIdx];
      if (w.length < 3) continue;

      for (const item of KNOWN_ENTITIES) {
        for (const alias of item.aliases) {
          const aliasParts = alias.split(/\s+/);
          for (const ap of aliasParts) {
            const d = levenshteinDistance(w, ap);
            if (d === 1 && ap.length >= 4) {
              correctedWords[wIdx] = ap;
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      bestMatch = correctedWords.join(' ');
    }
  }

  return (bestMatch && bestMatch !== q) ? bestMatch : null;
};

export const buildFlexibleSearchRegex = (value = '') => {
  const clean = value.trim().toLowerCase();
  if (!clean) return new RegExp('', 'i');
  
  // 1. Check known entities
  for (const item of KNOWN_ENTITIES) {
    if (item.aliases.includes(clean) || item.canonical === clean) {
      const patterns = item.aliases.map((a) => {
        if (a.includes(' ')) {
          return a.split(/\s+/).map(escapeRegExp).join('[\\s\\-_]*');
        }
        return escapeRegExp(a);
      });
      return new RegExp(patterns.join('|'), 'iu');
    }
  }

  // 2. Multi-word phrase: match space, hyphen, or concatenation (e.g. 'carry minati' matches 'carry minati', 'carryminati', 'carry-minati')
  if (clean.includes(' ')) {
    const parts = clean.split(/\s+/).map(escapeRegExp);
    return new RegExp(parts.join('[\\s\\-_]*'), 'iu');
  }

  // 3. Fallback: case-insensitive literal substring (matches inside compound words, e.g. 'carry' in 'CarryMinati', 'skrossi' in 'SkRossi')
  return new RegExp(escapeRegExp(clean), 'iu');
};

export const buildLiteralSearchRegex = buildFlexibleSearchRegex;

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

export const buildSearchFilter = (value, fields) => {
  const terms = tokenizeSearchQuery(value);
  if (terms.length === 0) return null;

  // If the entire query can be matched as a flexible phrase, include it
  const wholeQueryRegex = buildFlexibleSearchRegex(value);

  // Match all terms ($and) where each term can appear in any searchable field
  const andFilter = {
    $and: terms.map((term) => {
      const regex = buildFlexibleSearchRegex(term);
      return {
        $or: fields.map((field) => ({ [field]: { $regex: regex } }))
      };
    })
  };

  // If query has multiple terms, also match if the whole query pattern matches any field
  if (terms.length > 1) {
    return {
      $or: [
        andFilter,
        ...fields.map((field) => ({ [field]: { $regex: wholeQueryRegex } }))
      ]
    };
  }

  return andFilter;
};

export const buildRelaxedSearchFilter = (value, fields) => {
  const terms = tokenizeSearchQuery(value).filter((t) => t.length >= 3);
  if (terms.length === 0) return null;

  return {
    $or: terms.flatMap((term) => {
      const regex = buildFlexibleSearchRegex(term);
      return fields.map((field) => ({ [field]: { $regex: regex } }));
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
