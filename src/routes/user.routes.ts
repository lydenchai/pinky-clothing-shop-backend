import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Get all users
router.get("/", authenticate, userController.getAllUsers);

// Create, read, update, delete user routes
router.post("/create", userController.createUser);

// Get, update, delete user by ID
router.get("/find/:id", authenticate, userController.getUserById);

// Update and delete user by ID
router.patch("/update/:id", authenticate, userController.updateUser);

// Delete user by ID and update user role
router.delete("/delete/:id", authenticate, userController.deleteUser);

// Update user role
router.patch("/:id/role", authenticate, userController.updateUserRole);

export default router;
