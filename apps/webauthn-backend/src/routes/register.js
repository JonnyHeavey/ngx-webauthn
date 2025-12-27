const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');

router.post('/options', (req, res) => registerController.getOptions(req, res));
router.post('/verify', (req, res) => registerController.verify(req, res));

module.exports = router;
