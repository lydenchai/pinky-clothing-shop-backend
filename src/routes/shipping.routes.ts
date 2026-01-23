import { Router } from "express";
import {
  getAllShippings,
  getShippingById,
  createShipping,
  updateShipping,
  deleteShipping,
} from "../controllers/shipping.controller";

const router = Router();

// Shipping routes
router.get("/", getAllShippings);

// Get shipping details by ID
router.get("/find/:id", getShippingById);

// Create, update, and delete shipping options
router.post("/create", createShipping);

// Update shipping option
router.patch("/update/:id", updateShipping);

// Delete a shipping option
router.delete("/delete/:id", deleteShipping);

export default router;
