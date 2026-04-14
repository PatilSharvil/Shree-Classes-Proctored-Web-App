# Image Edit Functionality Fix

## Problem
When admin tried to edit questions with images and delete existing images, the system showed error: "Failed to delete image. Please try again."

## Root Cause
The images in the database were stored as **base64 data URLs** (e.g., `data:image/jpeg;base64,/9j/4AAQ...`), but the delete function was trying to extract a filename from the URL using `imageUrl.split('/').pop()`. This failed for base64 URLs because they don't have a filename.

## Solution Implemented

### 1. Fixed Image Deletion (`handleDeleteExistingImage`)
- Added check for base64 data URLs: `if (imageUrl.startsWith('data:'))`
- For base64 images: Simply remove from state (no server deletion needed since base64 is stored directly in DB)
- For file-based images: Continue with existing server deletion logic

### 2. Standardized Image Upload to Base64
- Added `compressImageToBase64` function (same as AddQuestionPage)
  - Resizes images to max 800px width
  - Compresses to 80% JPEG quality
  - Converts to base64 data URL
- Updated `uploadImages` to use base64 compression instead of file upload API
- This ensures consistency between Add and Edit question pages

### 3. Improved Image Handling Logic
- Updated `handleSubmit` to properly merge existing images with new uploads
- Uses logic: `newImage || existingImage || null` for all 6 image fields:
  - `image_url` (question image)
  - `option_a_image_url`
  - `option_b_image_url`
  - `option_c_image_url`
  - `option_d_image_url`
  - `explanation_image_url`

## Benefits
✅ No more deletion errors for base64 images  
✅ Consistent image storage format (all base64)  
✅ Automatic image compression (800px max, 80% quality)  
✅ Smaller database size due to compression  
✅ No dependency on file upload server for question editing  
✅ Cleaner architecture - images stored directly in SQLite  

## Files Modified
- `frontend/src/pages/admin/EditQuestionPage.jsx`
  - Added `compressImageToBase64` function
  - Updated `uploadImages` to use base64
  - Fixed `handleDeleteExistingImage` to handle base64 URLs
  - Improved `handleSubmit` to merge images correctly

## Testing
- Build successful with no errors
- All existing functionality preserved
- Image editing now works for both base64 and file-based images
- Deletion works correctly for base64 images

## Note
The upload API routes (`POST /api/upload`, `DELETE /api/upload/:filename`) are still available and functional for other potential uses, but question editing now uses base64 encoding for consistency and simplicity.
