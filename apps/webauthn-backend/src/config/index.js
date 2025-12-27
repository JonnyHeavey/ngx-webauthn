const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  host: process.env.HOST || 'localhost',

  // WebAuthn configuration
  rpName: process.env.RP_NAME || 'WebAuthn Demo',
  rpId: process.env.RP_ID || 'localhost',
  origin: process.env.ORIGIN || 'http://localhost:4201',

  // Challenge configuration
  challengeLength: 32,
  challengeTimeout: 600000, // 10 minutes in milliseconds

  // CORS configuration
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:4200', 'http://localhost:4201'],

  // Security configuration
  requireUserVerification: false,
  enforceOrigin: true,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = config;
