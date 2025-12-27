const config = require('../config');

class HealthController {
  /**
   * Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  check(req, res) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      config: {
        rpName: config.rpName,
        rpId: config.rpId,
        origin: config.origin,
        challengeTimeout: config.challengeTimeout,
      },
    });
  }
}

module.exports = new HealthController();
