/**
 * Cloudinary Upload Utility
 * Handles secure signed uploads for images, videos, and documents
 * With automatic web optimization
 */

import api from './api';

/**
 * Upload an image to Cloudinary with automatic optimization
 * @param {File} file - The file to upload
 * @param {string} folder - Destination folder (e.g., 'users/', 'projects/', 'company/')
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<object>} - Cloudinary response with public_id, secure_url, etc.
 */
export async function uploadImage(file, folder = 'uploads', onProgress = null) {
  return uploadToCloudinary(file, 'image', folder, onProgress);
}

/**
 * Upload a video to Cloudinary
 * @param {File} file - The video file to upload
 * @param {string} folder - Destination folder
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<object>} - Cloudinary response
 */
export async function uploadVideo(file, folder = 'uploads', onProgress = null) {
  return uploadToCloudinary(file, 'video', folder, onProgress);
}

/**
 * Upload a raw file (PDF, documents, etc.) to Cloudinary
 * @param {File} file - The file to upload
 * @param {string} folder - Destination folder
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<object>} - Cloudinary response
 */
export async function uploadDocument(file, folder = 'documents', onProgress = null) {
  return uploadToCloudinary(file, 'raw', folder, onProgress);
}

/**
 * Core upload function - handles signed uploads to Cloudinary
 * @param {File} file - File to upload
 * @param {string} resourceType - 'image', 'video', or 'raw'
 * @param {string} folder - Destination folder
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} - Cloudinary response
 */
async function uploadToCloudinary(file, resourceType, folder, onProgress) {
  try {
    // Step 1: Get signed upload parameters from backend
    const signatureResponse = await api.get('/cloudinary/signature', {
      params: { resource_type: resourceType, folder }
    });
    
    const sig = signatureResponse.data;
    
    // Step 2: Prepare form data for Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', sig.api_key);
    formData.append('timestamp', sig.timestamp);
    formData.append('signature', sig.signature);
    formData.append('folder', sig.folder);
    
    // Step 3: Upload directly to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resourceType}/upload`;
    
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al subir archivo');
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Delete an asset from Cloudinary
 * @param {string} publicId - The public ID of the asset to delete
 * @param {string} resourceType - 'image', 'video', or 'raw'
 * @returns {Promise<object>} - Delete response
 */
export async function deleteFromCloudinary(publicId, resourceType = 'image') {
  try {
    const response = await api.delete('/cloudinary/delete', {
      data: { public_id: publicId, resource_type: resourceType }
    });
    return response.data;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Generate an optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {string} - Optimized URL
 */
export function getOptimizedImageUrl(publicId, options = {}) {
  const {
    width,
    height,
    crop = 'fill',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto'
  } = options;
  
  // Get cloud name from the public ID URL or use env
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dobwd06je';
  
  let transforms = [`q_${quality}`, `f_${format}`];
  
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  if (gravity) transforms.push(`g_${gravity}`);
  
  const transformString = transforms.join(',');
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
}

/**
 * Get a thumbnail URL for an image
 * @param {string} publicId - Cloudinary public ID
 * @param {number} size - Thumbnail size (default 150)
 * @returns {string} - Thumbnail URL
 */
export function getThumbnailUrl(publicId, size = 150) {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto'
  });
}

/**
 * Get a profile image URL with face detection
 * @param {string} publicId - Cloudinary public ID
 * @param {number} size - Image size (default 200)
 * @returns {string} - Profile image URL
 */
export function getProfileImageUrl(publicId, size = 200) {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face'
  });
}

/**
 * Extract public ID from a Cloudinary URL
 * @param {string} url - Full Cloudinary URL
 * @returns {string} - Public ID
 */
export function extractPublicId(url) {
  if (!url) return null;
  
  // Match pattern: /upload/[transformations]/[public_id]
  const match = url.match(/\/upload\/(?:v\d+\/)?(?:[^/]+\/)*(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

export default {
  uploadImage,
  uploadVideo,
  uploadDocument,
  deleteFromCloudinary,
  getOptimizedImageUrl,
  getThumbnailUrl,
  getProfileImageUrl,
  extractPublicId
};
