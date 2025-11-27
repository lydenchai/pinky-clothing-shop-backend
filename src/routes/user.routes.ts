import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Admin routes (require authentication)

router.get('/', authenticate, userController.getAllUsers);
router.delete('/:id', authenticate, userController.deleteUser);
router.patch('/:id/role', authenticate, userController.updateUserRole);

export default router;
