/**
 * Service Routes
 * Routes untuk service management
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const serviceController = require('../controllers/serviceController');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const validate = require('../middleware/validate');

// Public routes
router.get('/', serviceController.getAllServices);
router.get('/popular', serviceController.getPopularServices);
router.get('/categories', serviceController.getCategories);
router.get('/:id', serviceController.getServiceById);

// Protected routes (admin only)
const serviceValidation = [
  body('category_id').isInt().withMessage('Category ID is required'),
  body('service_name').trim().notEmpty().withMessage('Service name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('duration_minutes').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
];

router.post(
  '/',
  verifyToken,
  isAdmin,
  upload.single('service_image'),
  handleMulterError,
  serviceValidation,
  validate,
  serviceController.createService
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  upload.single('service_image'),
  handleMulterError,
  serviceController.updateService
);

router.delete('/:id', verifyToken, isAdmin, serviceController.deleteService);
router.patch('/:id/toggle-active', verifyToken, isAdmin, serviceController.toggleActive);

module.exports = router;
