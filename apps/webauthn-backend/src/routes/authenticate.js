const express = require('express');
const router = express.Router();
const authenticateController = require('../controllers/authenticateController');

router.post('/options', (req, res) => authenticateController.getOptions(req, res));
router.post('/verify', (req, res) => authenticateController.verify(req, res));

module.exports = router;
