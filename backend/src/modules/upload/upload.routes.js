const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('./upload.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// We use memoryStorage to securely validate before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Route for uploading a single file (ADMIN only)
router.post('/', authenticate, authorize('ADMIN'), upload.single('file'), uploadController.uploadImage);

// Route for deleting an uploaded image (ADMIN only)
router.delete('/:filename', authenticate, authorize('ADMIN'), uploadController.deleteImage);

module.exports = router;
