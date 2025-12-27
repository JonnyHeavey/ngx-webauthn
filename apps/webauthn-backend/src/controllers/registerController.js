const webauthnService = require('../services/webauthnService');
const challengeService = require('../services/challengeService');
const credentialService = require('../services/credentialService');
const storageService = require('../services/storageService');
const config = require('../config');

class RegisterController {
  /**
   * Get registration options
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOptions(req, res) {
    try {
      const { username, displayName, preset } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username is required',
        });
      }

      console.log('[RegisterController] Getting registration options for:', username);

      // Generate challenge
      const challenge = challengeService.generate();

      // Store challenge
      challengeService.store(challenge, 'registration', username);

      // Get or create user
      let user = storageService.getUser(username);
      if (!user) {
        const crypto = require('crypto');
        const { bufferToBase64url } = require('../utils/base64url');
        const userId = bufferToBase64url(crypto.randomBytes(16));

        user = {
          username,
          userId,
          displayName: displayName || username,
          credentials: [],
          createdAt: new Date(),
        };
        storageService.storeUser(username, user);
        console.log('[RegisterController] Created new user:', username);
      }

      // Get existing credentials for exclusion
      const existingCredentials = credentialService.getByUsername(username);
      const excludeCredentials = existingCredentials.map((cred) => ({
        type: 'public-key',
        id: cred.credentialId,
      }));

      // Get authenticator selection based on preset
      const authenticatorSelection = this.getAuthenticatorSelection(preset);

      // Return options
      const options = {
        challenge,
        rp: {
          name: config.rpName,
          id: config.rpId,
        },
        user: {
          id: user.userId,
          name: user.username,
          displayName: user.displayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection,
        excludeCredentials,
      };

      console.log('[RegisterController] Returning registration options');
      res.json(options);
    } catch (error) {
      console.error('[RegisterController] Error getting registration options:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Verify registration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verify(req, res) {
    try {
      const result = await webauthnService.verifyRegistration(req.body, req.body.username);
      res.json(result);
    } catch (error) {
      console.error('[RegisterController] Error verifying registration:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get authenticator selection based on preset
   * @param {string} preset - Authenticator preset
   * @returns {Object} Authenticator selection options
   */
  getAuthenticatorSelection(preset) {
    const presets = {
      passkey: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      externalSecurityKey: {
        residentKey: 'discouraged',
        userVerification: 'preferred',
        authenticatorAttachment: 'cross-platform',
      },
      platformAuthenticator: {
        residentKey: 'required',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
    };

    return presets[preset] || presets.passkey;
  }
}

module.exports = new RegisterController();
