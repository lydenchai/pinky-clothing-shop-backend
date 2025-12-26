import { Router } from "express";
import {
  getUserWishlist,
  addProductToWishlist,
  removeProductFromWishlist,
} from "../controllers/wishlist.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, getUserWishlist);
router.post("/create", authenticate, addProductToWishlist);
router.post("/delete", authenticate, removeProductFromWishlist);

export default router;
