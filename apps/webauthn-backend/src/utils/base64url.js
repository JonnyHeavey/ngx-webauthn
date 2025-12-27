/**
 * Convert a Buffer to a base64url-encoded string
 * @param {Buffer} buffer - The buffer to encode
 * @returns {string} Base64url-encoded string
 */
function bufferToBase64url(buffer) {
  const base64 = buffer.toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert a base64url-encoded string to a Buffer
 * @param {string} base64url - The base64url-encoded string
 * @returns {Buffer} Decoded buffer
 */
function base64urlToBuffer(base64url) {
  // Add padding if necessary
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

/**
 * Convert a base64-encoded string to base64url
 * @param {string} base64 - The base64-encoded string
 * @returns {string} Base64url-encoded string
 */
function base64ToBase64url(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert a base64url-encoded string to base64
 * @param {string} base64url - The base64url-encoded string
 * @returns {string} Base64-encoded string
 */
function base64urlToBase64(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
}

module.exports = {
  bufferToBase64url,
  base64urlToBuffer,
  base64ToBase64url,
  base64urlToBase64,
};
