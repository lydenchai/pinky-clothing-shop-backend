import { Router } from "express";
import * as cartController from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All cart routes require authentication
router.use(authenticate);

router.get("/", cartController.getCart);
router.post("/add", cartController.cartItemValidation, cartController.addToCart);
router.get("/find/:id", cartController.getCartItemById);
router.patch("/update/:id", cartController.updateCartItem);
router.delete("/delete/:id", cartController.removeFromCart);
router.delete("/clear", cartController.clearCart);

export default router;
