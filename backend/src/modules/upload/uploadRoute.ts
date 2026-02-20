// backend/src/modules/upload/uploadRoute.ts
// POST /api/upload/item-photo  — authenticated, returns { url }

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../../lib/cloudinary';

const router = Router();

// Memory storage — no temp files on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /api/upload/item-photo
 * Multipart field: "photo" (image file)
 * Returns: { url: string }
 */
router.post(
  '/item-photo',
  upload.single('photo'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const url = await uploadToCloudinary(req.file.buffer, 'sazon/shopping-items');
      res.json({ url });
    } catch (error: any) {
      console.error('[UPLOAD] item-photo error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  },
);

export default router;
