import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, userController.getAllUsers);
router.get("/find/:id", authenticate, userController.getUserById);
router.delete("/delete/:id", authenticate, userController.deleteUser);
router.patch("/:id/role", authenticate, userController.updateUserRole);

export default router;
