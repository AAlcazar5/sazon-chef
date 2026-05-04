// backend/src/modules/scanner/scannerRoutes.ts
import { Router } from 'express';
import { scannerController, uploadImage } from './scannerController';
import { aiLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Food recognition from photo — vision API is cost-bearing.
router.post('/recognize-food', aiLimiter, uploadImage, scannerController.recognizeFood);

// Barcode scanning — local DB lookup, no AI cost
router.post('/scan-barcode', scannerController.scanBarcode);

export const scannerRoutes = router;

