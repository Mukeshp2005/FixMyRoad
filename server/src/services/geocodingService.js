import axios from 'axios';

// Lightweight in-memory geocoding cache (lat/lon rounded to 4 decimals -> ~11 meters precision)
const geocodeCache = new Map();
const CACHE_TTL_MS = 3600000; // 1 hour TTL

/**
 * Validates coordinates and performs reverse geocoding to retrieve normalized address data.
 * @param {number|string} lat - Latitude (-90 to 90)
 * @param {number|string} lon - Longitude (-180 to 180)
 * @returns {Promise<Object>} Normalized address object
 */
export const reverseGeocode = async (lat, lon) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  // 1. Coordinate Validation
  if (isNaN(latitude) || isNaN(longitude)) {
    const error = new Error('Invalid coordinates. Latitude and Longitude must be valid numbers.');
    error.statusCode = 400;
    throw error;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    const error = new Error('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Cache Lookup (Round coords to 4 decimal places)
  const cacheKey = `geo_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
  const cached = geocodeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 3. Provider Request (OpenStreetMap Nominatim abstraction)
  const baseUrl = process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org';

  try {
    const response = await axios.get(`${baseUrl}/reverse`, {
      params: {
        format: 'jsonv2',
        lat: latitude,
        lon: longitude,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'FixMyRoad/1.0 (contact@fixmyroad.local)', // Mandatory for Nominatim policy compliance
        'Accept-Language': 'en',
      },
      timeout: 6000, // 6 second timeout
    });

    if (!response.data || response.data.error) {
      const error = new Error('Unable to determine the address for this location.');
      error.statusCode = 404;
      throw error;
    }

    const addr = response.data.address || {};

    // 4. Response Normalization
    const normalizedData = {
      latitude,
      longitude,
      address:
        response.data.name ||
        [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ') ||
        response.data.display_name ||
        'Location Details Captured',
      city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
      district: addr.state_district || addr.district || addr.county || addr.city || '',
      state: addr.state || '',
      country: addr.country || '',
      postalCode: addr.postcode || '',
    };

    // Store in cache
    geocodeCache.set(cacheKey, {
      timestamp: Date.now(),
      data: normalizedData,
    });

    return normalizedData;
  } catch (error) {
    if (error.statusCode) throw error;

    console.error('❌ Reverse Geocoding Error:', error.message);
    const err = new Error('Unable to determine the address for this location.');
    err.statusCode = 502;
    throw err;
  }
};

/**
 * Forward geocoding: Search places/localities by text query
 * @param {string} query - Location text query (e.g. "Gandhipuram, Coimbatore")
 * @returns {Promise<Array>} Array of matching places with coordinates
 */
export const searchAddress = async (query) => {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  const trimmed = query.trim();
  const cacheKey = `search_${trimmed.toLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const baseUrl = process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org';

  try {
    const response = await axios.get(`${baseUrl}/search`, {
      params: {
        format: 'jsonv2',
        q: trimmed,
        limit: 5,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'FixMyRoad/1.0 (contact@fixmyroad.local)',
        'Accept-Language': 'en',
      },
      timeout: 7000,
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    const results = response.data.map((item) => {
      const addr = item.address || {};
      return {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name,
        address:
          item.name ||
          [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ') ||
          item.display_name,
        city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
        district: addr.state_district || addr.district || addr.county || addr.city || '',
        state: addr.state || '',
        country: addr.country || '',
        postalCode: addr.postcode || '',
      };
    });

    geocodeCache.set(cacheKey, {
      timestamp: Date.now(),
      data: results,
    });

    return results;
  } catch (error) {
    console.error('❌ Search Geocoding Error:', error.message);
    return [];
  }
};
