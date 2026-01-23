import { Router } from "express";
import * as cartController from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// Get current user's cart
router.get("/", cartController.getCart);

// Add item to cart
router.post( "/add", cartController.cartItemValidation, cartController.addToCart);

// Get, update, delete specific cart item by ID
router.get("/find/:id", cartController.getCartItemById);

// Update cart item
router.patch("/update/:id", cartController.updateCartItem);

// Remove item from cart
router.delete("/delete/:id", cartController.removeFromCart);

// Clear the entire cart
router.delete("/clear", cartController.clearCart);

// Alias: allow DELETE /api/cart to also clear the cart
router.delete("/", cartController.clearCart);

export default router;
