// backend/src/modules/scanner/scannerRoutes.ts
import { Router } from 'express';
import { scannerController, uploadImage } from './scannerController';

const router = Router();

// Food recognition from photo
router.post('/recognize-food', uploadImage, scannerController.recognizeFood);

// Barcode scanning
router.post('/scan-barcode', scannerController.scanBarcode);

export const scannerRoutes = router;

