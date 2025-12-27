/**
 * In-memory storage service for challenges, credentials, and users
 */

const storage = {
  // Map: challenge -> StoredChallenge
  challenges: new Map(),

  // Map: username -> StoredUser
  users: new Map(),

  // Map: credentialId -> StoredCredential
  credentials: new Map(),
};

class StorageService {
  /**
   * Store a challenge
   * @param {string} challenge - The challenge string
   * @param {Object} challengeData - Challenge data to store
   */
  storeChallenge(challenge, challengeData) {
    storage.challenges.set(challenge, challengeData);
  }

  /**
   * Get a challenge by its value
   * @param {string} challenge - The challenge string
   * @returns {Object|null} The stored challenge or null if not found
   */
  getChallenge(challenge) {
    return storage.challenges.get(challenge) || null;
  }

  /**
   * Delete a challenge
   * @param {string} challenge - The challenge string
   */
  deleteChallenge(challenge) {
    storage.challenges.delete(challenge);
  }

  /**
   * Clean up expired challenges
   * @returns {number} Number of challenges cleaned up
   */
  cleanupExpiredChallenges() {
    const now = new Date();
    let cleaned = 0;

    for (const [challenge, data] of storage.challenges.entries()) {
      if (now > data.expiresAt) {
        storage.challenges.delete(challenge);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Store a user
   * @param {string} username - The username
   * @param {Object} userData - User data to store
   */
  storeUser(username, userData) {
    storage.users.set(username, userData);
  }

  /**
   * Get a user by username
   * @param {string} username - The username
   * @returns {Object|null} The stored user or null if not found
   */
  getUser(username) {
    return storage.users.get(username) || null;
  }

  /**
   * Get a user by user ID
   * @param {string} userId - The user ID
   * @returns {Object|null} The stored user or null if not found
   */
  getUserByUserId(userId) {
    for (const [username, user] of storage.users.entries()) {
      if (user.userId === userId) {
        return user;
      }
    }
    return null;
  }

  /**
   * Add a credential ID to a user
   * @param {string} username - The username
   * @param {string} credentialId - The credential ID to add
   */
  addCredentialToUser(username, credentialId) {
    const user = storage.users.get(username);
    if (user && !user.credentials.includes(credentialId)) {
      user.credentials.push(credentialId);
    }
  }

  /**
   * Store a credential
   * @param {string} credentialId - The credential ID
   * @param {Object} credentialData - Credential data to store
   */
  storeCredential(credentialId, credentialData) {
    storage.credentials.set(credentialId, credentialData);
  }

  /**
   * Get a credential by credential ID
   * @param {string} credentialId - The credential ID
   * @returns {Object|null} The stored credential or null if not found
   */
  getCredential(credentialId) {
    return storage.credentials.get(credentialId) || null;
  }

  /**
   * Get all credentials for a user
   * @param {string} username - The username
   * @returns {Array} Array of credentials for the user
   */
  getCredentialsByUser(username) {
    const credentials = [];
    for (const [id, cred] of storage.credentials.entries()) {
      if (cred.username === username) {
        credentials.push(cred);
      }
    }
    return credentials;
  }

  /**
   * Update credential counter
   * @param {string} credentialId - The credential ID
   * @param {number} counter - The new counter value
   */
  updateCredentialCounter(credentialId, counter) {
    const credential = storage.credentials.get(credentialId);
    if (credential) {
      credential.counter = counter;
    }
  }

  /**
   * Get storage statistics (for debugging)
   * @returns {Object} Storage statistics
   */
  getStats() {
    return {
      challenges: storage.challenges.size,
      users: storage.users.size,
      credentials: storage.credentials.size,
    };
  }

  /**
   * Clear all storage (for testing)
   */
  clearAll() {
    storage.challenges.clear();
    storage.users.clear();
    storage.credentials.clear();
  }
}

module.exports = new StorageService();
