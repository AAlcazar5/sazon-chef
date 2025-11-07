// backend/src/modules/scanner/scannerController.ts
// Scanner API controller (Phase 6, Group 13)

import { Request, Response } from 'express';
import { foodRecognitionService } from '@/services/foodRecognitionService';
import multer from 'multer';

// Configure multer for memory storage (we'll process images in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const scannerController = {
  /**
   * Recognize food from photo and estimate calories
   * POST /api/scanner/recognize-food
   */
  async recognizeFood(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual auth
      console.log('📸 POST /api/scanner/recognize-food called');

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Convert image to base64
      const imageBase64 = req.file.buffer.toString('base64');
      const imageMimeType = req.file.mimetype;

      // Recognize food and estimate calories
      const result = await foodRecognitionService.recognizeFoodFromPhoto(imageBase64, imageMimeType);

      console.log('✅ Food recognized:', result.mealDescription, `(${result.totalEstimatedCalories} calories)`);

      res.json({
        success: true,
        result,
      });
    } catch (error: any) {
      console.error('❌ Food recognition error:', error);
      res.status(500).json({
        error: 'Failed to recognize food',
        message: error.message,
      });
    }
  },

  /**
   * Scan barcode and get nutritional information
   * POST /api/scanner/scan-barcode
   */
  async scanBarcode(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id'; // TODO: Replace with actual auth
      const { barcode } = req.body;

      console.log('📱 POST /api/scanner/scan-barcode called:', barcode);

      if (!barcode || typeof barcode !== 'string') {
        return res.status(400).json({ error: 'Barcode is required' });
      }

      // Scan barcode
      const result = await foodRecognitionService.scanBarcode(barcode);

      if (!result) {
        return res.status(404).json({
          error: 'Product not found',
          message: 'The barcode was not found in our database',
        });
      }

      console.log('✅ Barcode scanned:', result.productName);

      res.json({
        success: true,
        result,
      });
    } catch (error: any) {
      console.error('❌ Barcode scan error:', error);
      res.status(500).json({
        error: 'Failed to scan barcode',
        message: error.message,
      });
    }
  },
};

// Export multer middleware for use in routes
export const uploadImage = upload.single('image');

