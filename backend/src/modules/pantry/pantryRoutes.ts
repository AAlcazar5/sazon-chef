import { Router } from 'express';
import { pantryController } from './pantryController';

const router = Router();

router.get('/', pantryController.getAll);
router.post('/', pantryController.addItem);
router.post('/bulk', pantryController.addMany);
router.delete('/by-name/:name', pantryController.removeByName);
router.delete('/:id', pantryController.removeItem);

export default router;
