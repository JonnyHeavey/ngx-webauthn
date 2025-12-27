const webauthnService = require('../services/webauthnService');
const challengeService = require('../services/challengeService');
const credentialService = require('../services/credentialService');
const storageService = require('../services/storageService');
const config = require('../config');

class AuthenticateController {
  /**
   * Get authentication options
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOptions(req, res) {
    try {
      const { username } = req.body;

      console.log('[AuthenticateController] Getting authentication options for:', username || 'discoverable');

      // Generate challenge
      const challenge = challengeService.generate();

      // Store challenge
      challengeService.store(challenge, 'authentication', username);

      // Build allowCredentials
      let allowCredentials = [];
      if (username) {
        const user = storageService.getUser(username);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        const credentials = credentialService.getByUsername(username);
        allowCredentials = credentials.map((cred) => ({
          type: 'public-key',
          id: cred.credentialId,
          transports: cred.transports,
        }));

        console.log('[AuthenticateController] Found', allowCredentials.length, 'credentials for user:', username);
      } else {
        console.log('[AuthenticateController] Discoverable credentials mode');
      }

      // Return options
      const options = {
        challenge,
        timeout: 60000,
        rpId: config.rpId,
        allowCredentials,
        userVerification: config.requireUserVerification ? 'required' : 'preferred',
      };

      console.log('[AuthenticateController] Returning authentication options');
      res.json(options);
    } catch (error) {
      console.error('[AuthenticateController] Error getting authentication options:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Verify authentication
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verify(req, res) {
    try {
      const result = await webauthnService.verifyAuthentication(req.body);
      res.json(result);
    } catch (error) {
      console.error('[AuthenticateController] Error verifying authentication:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new AuthenticateController();
