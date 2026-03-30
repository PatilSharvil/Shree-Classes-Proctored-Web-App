import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} html - Raw HTML string
 * @returns {string} - Sanitized HTML string
 */
export const sanitizeHTML = (html) => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'sub', 'sup'],
    ALLOWED_ATTR: ['class']
  });
};

/**
 * Sanitize plain text (strip all HTML)
 * @param {string} text - Raw text string
 * @returns {string} - Sanitized text string
 */
export const sanitizeText = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize object with multiple fields
 * @param {Object} obj - Object with string values
 * @param {Array<string>} fields - Fields to sanitize
 * @returns {Object} - Object with sanitized fields
 */
export const sanitizeObject = (obj, fields) => {
  if (!obj) return obj;
  
  const sanitized = { ...obj };
  fields.forEach(field => {
    if (typeof obj[field] === 'string') {
      sanitized[field] = sanitizeHTML(obj[field]);
    }
  });
  
  return sanitized;
};

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeObject
};
