import api from './api';

/**
 * Uploads a road damage photo file to Express backend.
 * Handles both raw File object or FormData payload seamlessly.
 * @param {File|FormData} fileOrFormData - Selected image file object or FormData
 * @returns {Promise<Object>} API response payload with secure imageUrl and metadata
 */
export const uploadRoadImage = async (fileOrFormData) => {
  let formData;
  if (fileOrFormData instanceof FormData) {
    formData = fileOrFormData;
  } else {
    formData = new FormData();
    formData.append('image', fileOrFormData);
  }

  return await api.post('/uploads/road-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
