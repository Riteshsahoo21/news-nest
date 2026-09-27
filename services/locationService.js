import axios from 'axios';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_PROVIDER_INTERVAL_MS = 1100;
const MAX_CACHE_ENTRIES = 1000;
const locationCache = new Map();
let lastProviderRequestAt = 0;
let providerQueue = Promise.resolve();

const coordinateCacheKey = (latitude, longitude) => (
  `${Number(latitude).toFixed(2)},${Number(longitude).toFixed(2)}`
);

const firstValue = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

export const normalizeLocalityName = (value = '') => String(value)
  .replace(/\s+(municipal corporation|municipal council|municipality|city corporation)$/i, '')
  .trim();

const enqueueProviderRequest = (request) => {
  const run = providerQueue.then(async () => {
    const waitMs = Math.max(0, MIN_PROVIDER_INTERVAL_MS - (Date.now() - lastProviderRequestAt));
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastProviderRequestAt = Date.now();
    return request();
  });

  providerQueue = run.catch(() => undefined);
  return run;
};

export const validateCoordinates = (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const error = new Error('Valid latitude and longitude are required.');
    error.statusCode = 400;
    throw error;
  }

  return { latitude: lat, longitude: lon };
};

export const reverseGeocode = async (latitude, longitude) => {
  const coordinates = validateCoordinates(latitude, longitude);
  const cacheKey = coordinateCacheKey(coordinates.latitude, coordinates.longitude);
  const cached = locationCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const baseUrl = process.env.REVERSE_GEOCODER_URL || 'https://nominatim.openstreetmap.org/reverse';
  const appIdentity = process.env.NEWS_APP_USER_AGENT || `NewsNests/1.0 (${process.env.PUBLIC_APP_URL || 'http://localhost:5173'})`;
  const response = await enqueueProviderRequest(() => axios.get(baseUrl, {
    params: {
      format: 'jsonv2',
      lat: coordinates.latitude,
      lon: coordinates.longitude,
      zoom: 10,
      addressdetails: 1
    },
    headers: {
      'User-Agent': appIdentity,
      'Accept-Language': 'en'
    },
    timeout: 7000
  }));

  const address = response.data?.address || {};
  const city = normalizeLocalityName(
    firstValue(address.city, address.town, address.village, address.municipality, address.county)
  );
  const region = firstValue(address.state, address.region, address.state_district, address.county);
  const country = firstValue(address.country);
  const countryCode = firstValue(address.country_code).toLowerCase();

  const value = {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    city,
    region,
    country,
    countryCode,
    label: [city, region, country].filter(Boolean).filter((part, index, list) => list.indexOf(part) === index).join(', ')
  };

  if (locationCache.size >= MAX_CACHE_ENTRIES) {
    locationCache.delete(locationCache.keys().next().value);
  }
  locationCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
};
