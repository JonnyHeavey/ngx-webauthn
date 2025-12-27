const storageService = require('./storageService');

class CredentialService {
  /**
   * Store a credential after successful registration
   * @param {Object} credentialData - Credential data to store
   * @returns {Object} The stored credential
   */
  store(credentialData) {
    const credential = {
      credentialId: credentialData.credentialId,
      username: credentialData.username,
      publicKey: credentialData.publicKey,
      counter: credentialData.counter || 0,
      transports: credentialData.transports || [],
      createdAt: credentialData.createdAt || new Date(),
    };

    storageService.storeCredential(credential.credentialId, credential);
    return credential;
  }

  /**
   * Get a credential by credential ID
   * @param {string} credentialId - The credential ID
   * @returns {Object|null} The stored credential or null if not found
   */
  getByCredentialId(credentialId) {
    return storageService.getCredential(credentialId);
  }

  /**
   * Get all credentials for a user
   * @param {string} username - The username
   * @returns {Array} Array of credentials for the user
   */
  getByUsername(username) {
    return storageService.getCredentialsByUser(username);
  }

  /**
   * Update the signature counter for a credential
   * @param {string} credentialId - The credential ID
   * @param {number} counter - The new counter value
   * @returns {Object|null} The updated credential or null if not found
   */
  updateCounter(credentialId, counter) {
    storageService.updateCredentialCounter(credentialId, counter);
    return this.getByCredentialId(credentialId);
  }

  /**
   * Check if a credential exists
   * @param {string} credentialId - The credential ID
   * @returns {boolean} True if the credential exists
   */
  exists(credentialId) {
    return this.getByCredentialId(credentialId) !== null;
  }

  /**
   * Get credential statistics for a user
   * @param {string} username - The username
   * @returns {Object} Statistics including count and transports
   */
  getUserStats(username) {
    const credentials = this.getByUsername(username);
    const transports = new Set();

    credentials.forEach((cred) => {
      if (cred.transports) {
        cred.transports.forEach((t) => transports.add(t));
      }
    });

    return {
      count: credentials.length,
      transports: Array.from(transports),
    };
  }
}

module.exports = new CredentialService();
