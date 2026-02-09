import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// User registration
router.post(
  "/register",
  authController.registerValidation,
  authController.register,
);

// User login
router.post("/login", authController.loginValidation, authController.login);

// User logout
router.post("/logout", authenticate, authController.logout);

// Get and update user profile
router.get("/profile", authenticate, authController.getProfile);

// Update user profile
router.patch("/profile", authenticate, authController.updateProfile);

export default router;
