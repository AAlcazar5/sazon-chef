import { Router } from 'express';
import { pantryController } from './pantryController';
import { getExpiringPantryItemsRoute } from './pantryExpiringController';

const router = Router();

// ROADMAP 4.0 IG4.3 — soon-to-expire pantry items for the use-it-up surface.
router.get('/expiring', getExpiringPantryItemsRoute);

router.get('/', pantryController.getAll);
router.post('/', pantryController.addItem);
router.post('/bulk', pantryController.addMany);
router.post('/consume', pantryController.consume);
router.delete('/by-name/:name', pantryController.removeByName);
router.delete('/:id', pantryController.removeItem);

export default router;
