const { apiResponse, errorResponse } = require('../../utils/apiResponse');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/**
 * Handle Single Image Upload
 * POST /api/upload
 */
const uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded');
    }

    // Generate unique name
    const ext = path.extname(req.file.originalname) || '.png';
    const filename = crypto.randomUUID() + ext;

    const uploadsDir = path.join(__dirname, '../../..', 'data/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    // Return the public URL
    const publicUrl = `/uploads/${filename}`;

    return apiResponse(res, 200, { url: publicUrl }, 'File uploaded successfully');
  } catch (error) {
    console.error('Upload Error:', error);
    return errorResponse(res, 500, 'Upload failed', error.message);
  }
};

/**
 * Delete an uploaded image
 * DELETE /api/upload/:filename
 */
const deleteImage = (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Prevent path traversal attacks
    const sanitizedFilename = path.basename(filename);
    
    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(sanitizedFilename).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return errorResponse(res, 400, 'Invalid file type');
    }

    const uploadsDir = path.join(__dirname, '../../..', 'data/uploads');
    const filePath = path.join(uploadsDir, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return errorResponse(res, 404, 'Image not found');
    }

    // Delete the file
    fs.unlinkSync(filePath);

    return apiResponse(res, 200, null, 'Image deleted successfully');
  } catch (error) {
    console.error('Delete Image Error:', error);
    return errorResponse(res, 500, 'Failed to delete image', error.message);
  }
};

module.exports = {
  uploadImage,
  deleteImage
};
