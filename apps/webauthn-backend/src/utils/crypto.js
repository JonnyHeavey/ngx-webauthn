const crypto = require('crypto');
const { bufferToBase64url } = require('./base64url');

/**
 * Generate cryptographically secure random bytes
 * @param {number} length - Number of bytes to generate (default: 32)
 * @returns {string} Base64url-encoded random bytes
 */
function generateRandomBytes(length = 32) {
  const bytes = crypto.randomBytes(length);
  return bufferToBase64url(bytes);
}

/**
 * Generate a SHA-256 hash
 * @param {string|Buffer} data - Data to hash
 * @returns {Buffer} SHA-256 hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

/**
 * Verify an ECDSA signature (ES256)
 * @param {Buffer} x - X coordinate of the public key
 * @param {Buffer} y - Y coordinate of the public key
 * @param {Buffer} data - Data that was signed
 * @param {Buffer} signature - Signature to verify
 * @returns {boolean} True if signature is valid
 */
function verifyECDSASignature(x, y, data, signature) {
  try {
    // Create public key from coordinates in JWK format
    const publicKey = crypto.createPublicKey({
      key: {
        kty: 'EC',
        crv: 'P-256',
        x: bufferToBase64url(x),
        y: bufferToBase64url(y),
        key_ops: ['verify'],
      },
      format: 'jwk',
    });

    // Verify signature
    return crypto.verify('sha256', data, publicKey, signature);
  } catch (error) {
    console.error('ECDSA signature verification error:', error);
    return false;
  }
}

/**
 * Verify an RSA signature (RS256)
 * @param {Buffer} n - Modulus of the public key
 * @param {Buffer} e - Exponent of the public key
 * @param {Buffer} data - Data that was signed
 * @param {Buffer} signature - Signature to verify
 * @returns {boolean} True if signature is valid
 */
function verifyRSASignature(n, e, data, signature) {
  try {
    // Create public key from modulus and exponent in JWK format
    const publicKey = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: bufferToBase64url(n),
        e: bufferToBase64url(e),
        alg: 'RS256',
        key_ops: ['verify'],
      },
      format: 'jwk',
    });

    // Verify signature
    return crypto.verify('sha256', data, publicKey, signature);
  } catch (error) {
    console.error('RSA signature verification error:', error);
    return false;
  }
}

/**
 * Parse a COSE key to extract public key parameters
 * @param {Map} coseKey - COSE key as a Map (from CBOR decoding)
 * @returns {Object} Parsed public key with type and parameters
 */
function parseCOSEKey(coseKey) {
  const keyType = coseKey.get(1); // 1 = key type
  const algorithm = coseKey.get(3); // 3 = algorithm

  if (keyType === 2) {
    // EC2 key (ECDSA)
    return {
      type: 'EC2',
      algorithm,
      curve: coseKey.get(-1), // -1 = curve (P-256 = 1)
      x: coseKey.get(-2), // -2 = X coordinate
      y: coseKey.get(-3), // -3 = Y coordinate
    };
  } else if (keyType === 3) {
    // RSA key
    return {
      type: 'RSA',
      algorithm,
      n: coseKey.get(-2), // -2 = modulus
      e: coseKey.get(-1), // -1 = exponent
    };
  }

  throw new Error(`Unsupported key type: ${keyType}`);
}

module.exports = {
  generateRandomBytes,
  sha256,
  verifyECDSASignature,
  verifyRSASignature,
  parseCOSEKey,
};
