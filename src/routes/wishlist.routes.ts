import { Router } from "express";
import {
  getUserWishlist,
  addProductToWishlist,
  removeProductFromWishlist,
} from "../controllers/wishlist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Wishlist routes
router.get("/", authenticate, getUserWishlist);

// Add and remove products from wishlist
router.post("/create", authenticate, addProductToWishlist);

// Remove product from wishlist
router.post("/delete", authenticate, removeProductFromWishlist);

export default router;
