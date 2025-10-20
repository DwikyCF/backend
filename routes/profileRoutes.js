/**
 * Profile Routes
 * Routes untuk customer profile management
 */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;
