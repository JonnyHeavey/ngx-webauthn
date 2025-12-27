const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

router.get('/', (req, res) => healthController.check(req, res));

module.exports = router;
