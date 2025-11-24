import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Admin routes (require authentication)
router.get('/', authenticate, userController.getAllUsers);
router.delete('/:id', authenticate, userController.deleteUser);

export default router;
