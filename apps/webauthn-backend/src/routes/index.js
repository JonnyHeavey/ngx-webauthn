const express = require('express');
const router = express.Router();

const healthRoutes = require('./health');
const registerRoutes = require('./register');
const authenticateRoutes = require('./authenticate');

router.use('/health', healthRoutes);
router.use('/webauthn/register', registerRoutes);
router.use('/webauthn/authenticate', authenticateRoutes);

module.exports = router;
