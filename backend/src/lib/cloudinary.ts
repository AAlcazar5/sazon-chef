// backend/src/lib/cloudinary.ts
// Cloudinary upload helper for item/user media

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * @param buffer  Raw image bytes (from multer memoryStorage)
 * @param folder  Cloudinary folder, e.g. "sazon/shopping-items"
 */
export function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ width: 800, quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
}

export { cloudinary };
