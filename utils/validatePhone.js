// validatePhone.js

/**
 * Check if a phone number follows standard Tanzanian format
 * Valid formats:
 * - 255XXXXXXXXX (international format with country code)
 * - 0XXXXXXXXX (local format starting with 0)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const checkPhoneFormat = (phone) => {
  if (!phone) return false;
  
  // Clean the phone number of spaces, dashes, etc.
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check if it's a valid Tanzanian number
  if (/^255\d{9}$/.test(cleanPhone)) {
    // International format with country code
    return true;
  } else if (/^0\d{9}$/.test(cleanPhone)) {
    // Local format starting with 0
    return true;
  }
  
  return false;
};

/**
 * Format a phone number to the standard international Tanzanian format
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number (255XXXXXXXXX) or original if invalid
 */
const formatPhone = (phone) => {
  if (!phone) return phone;
  
  // Clean the phone number of spaces, dashes, etc.
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Format as international Tanzanian number
  if (/^0\d{9}$/.test(cleanPhone)) {
    // Convert local format to international
    return `255${cleanPhone.substring(1)}`;
  } else if (/^255\d{9}$/.test(cleanPhone)) {
    // Already in correct format
    return cleanPhone;
  }
  
  // Return original if not in expected format
  return phone;
};

module.exports = {
  checkPhoneFormat,
  formatPhone
};
