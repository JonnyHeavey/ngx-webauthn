const { generateRandomBytes } = require('../utils/crypto');
const storageService = require('./storageService');
const config = require('../config');

class ChallengeService {
  /**
   * Generate a new cryptographically secure challenge
   * @returns {string} Base64url-encoded challenge
   */
  generate() {
    return generateRandomBytes(config.challengeLength);
  }

  /**
   * Store a challenge with expiration
   * @param {string} challenge - The challenge string
   * @param {string} type - Challenge type ('registration' or 'authentication')
   * @param {string} username - Optional username associated with the challenge
   * @returns {Object} The stored challenge data
   */
  store(challenge, type, username = null) {
    const challengeData = {
      challenge,
      username,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.challengeTimeout),
      type,
    };

    storageService.storeChallenge(challenge, challengeData);
    return challengeData;
  }

  /**
   * Get and validate a challenge
   * @param {string} challenge - The challenge string
   * @returns {Object} The stored challenge data
   * @throws {Error} If challenge not found or expired
   */
  get(challenge) {
    const stored = storageService.getChallenge(challenge);

    if (!stored) {
      throw new Error('Challenge not found');
    }

    if (new Date() > stored.expiresAt) {
      storageService.deleteChallenge(challenge);
      throw new Error('Challenge expired');
    }

    return stored;
  }

  /**
   * Delete a challenge
   * @param {string} challenge - The challenge string
   */
  delete(challenge) {
    storageService.deleteChallenge(challenge);
  }

  /**
   * Clean up all expired challenges
   * @returns {number} Number of challenges cleaned up
   */
  cleanup() {
    return storageService.cleanupExpiredChallenges();
  }

  /**
   * Start periodic cleanup of expired challenges
   * @param {number} intervalMs - Cleanup interval in milliseconds (default: 5 minutes)
   */
  startPeriodicCleanup(intervalMs = 300000) {
    setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`[ChallengeService] Cleaned up ${cleaned} expired challenges`);
      }
    }, intervalMs);
  }
}

module.exports = new ChallengeService();
