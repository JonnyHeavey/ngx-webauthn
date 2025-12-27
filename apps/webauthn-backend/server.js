const express = require('express');
const bodyParser = require('body-parser');
const corsMiddleware = require('./src/middleware/cors');
const { logger } = require('./src/middleware/logger');
const { errorHandler } = require('./src/middleware/errorHandler');
const routes = require('./src/routes');
const challengeService = require('./src/services/challengeService');
const config = require('./src/config');

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(bodyParser.json());
app.use(logger);

// Routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, config.host, () => {
  console.log('='.repeat(60));
  console.log('WebAuthn Backend Server');
  console.log('='.repeat(60));
  console.log(`Server running on http://${config.host}:${config.port}`);
  console.log(`RP Name: ${config.rpName}`);
  console.log(`RP ID: ${config.rpId}`);
  console.log(`Origin: ${config.origin}`);
  console.log(`Challenge Timeout: ${config.challengeTimeout}ms`);
  console.log('='.repeat(60));
  console.log('\nAvailable endpoints:');
  console.log(`  GET  http://${config.host}:${config.port}/api/health`);
  console.log(`  POST http://${config.host}:${config.port}/api/webauthn/register/options`);
  console.log(`  POST http://${config.host}:${config.port}/api/webauthn/register/verify`);
  console.log(`  POST http://${config.host}:${config.port}/api/webauthn/authenticate/options`);
  console.log(`  POST http://${config.host}:${config.port}/api/webauthn/authenticate/verify`);
  console.log('='.repeat(60));
  console.log('\nPress Ctrl+C to stop the server\n');
});

// Start periodic cleanup of expired challenges
challengeService.startPeriodicCleanup();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[SIGTERM] Shutting down gracefully...');
  server.close(() => {
    console.log('[SIGTERM] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[SIGINT] Shutting down gracefully...');
  server.close(() => {
    console.log('[SIGINT] Server closed');
    process.exit(0);
  });
});

module.exports = app;
