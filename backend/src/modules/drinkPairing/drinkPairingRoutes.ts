// backend/src/modules/drinkPairing/drinkPairingRoutes.ts
// ROADMAP 4.0 F8 — Drink pairing routes.

import { Router } from 'express';
import { drinkPairingController } from './drinkPairingController';

export const drinkPairingRoutes = Router();
drinkPairingRoutes.get('/', drinkPairingController.get);
