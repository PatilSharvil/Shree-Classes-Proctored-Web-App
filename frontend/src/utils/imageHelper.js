/**
 * Helper function to generate proper image URLs
 * Uses the API_URL from environment variables to construct image URLs
 * This ensures images work correctly in both development and production
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get the base URL for image uploads
 * Removes '/api' suffix from API_URL to get the base server URL
 */
export const getUploadBaseUrl = () => {
  // If API_URL ends with '/api', remove it to get the base URL
  if (API_URL.endsWith('/api')) {
    return API_URL.slice(0, -4);
  }
  // Otherwise, return as-is or fallback to localhost
  return API_URL;
};

/**
 * Generate full image URL from a relative path or return data URL as-is
 * @param {string} imagePath - Can be:
 *   - Data URL: 'data:image/jpeg;base64,/9j/4AA...'
 *   - Relative path: '/uploads/abc123.jpg' or 'uploads/abc123.jpg'
 *   - Full URL: 'http://example.com/image.jpg'
 * @returns {string} Full URL or data URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return '';
  }

  // If it's already a full URL or data URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Ensure image path starts with '/'
  let normalizedPath = imagePath;
  if (!imagePath.startsWith('/')) {
    normalizedPath = `/${imagePath}`;
  }

  const baseUrl = getUploadBaseUrl();
  const fullUrl = `${baseUrl}${normalizedPath}`;

  return fullUrl;
};
