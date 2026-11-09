import api from './api';

/**
 * Perform reverse geocoding to convert lat/lon coordinates into a human-readable address.
 * Calls Express backend API (React never calls Nominatim directly).
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>} Normalized address object
 */
export const reverseGeocodeApi = async (latitude, longitude) => {
  return await api.get('/geocoding/reverse', {
    params: {
      lat: latitude,
      lon: longitude,
    },
  });
};

/**
 * Perform forward geocoding to search localities or road landmarks by text query.
 * Calls Express backend API.
 * @param {string} query 
 * @returns {Promise<Object>} API response with list of matched locations
 */
export const searchPlacesApi = async (query) => {
  return await api.get('/geocoding/search', {
    params: {
      q: query,
    },
  });
};
