import { Router } from "express";

import {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  adjustStock,
  getInventoryLogs,
  getStockMovementSummary,
} from "../controllers/inventory.controller";
import { authenticate, adminOnly } from "../middleware/auth.middleware";

const router = Router();

// Inventory routes
router.get("/", getAllInventory);

// Get inventory item by ID
router.get("/find/:id", getInventoryById);

// Admin-only routes
router.post("/create", authenticate, adminOnly, createInventory);

// Update, delete, and adjust stock of inventory items
router.patch("/update/:id/", authenticate, adminOnly, updateInventory);

// Delete an inventory item
router.delete("/delete/:id", authenticate, adminOnly, deleteInventory);

// Adjust stock quantity of an inventory item
router.patch("/update/:id/adjust", authenticate, adminOnly, adjustStock);

// Get inventory movement logs for a given inventory item
router.get("/:id/logs", authenticate, adminOnly, getInventoryLogs);

// Stock movement summary (admin only)
router.get("/stock-movement-summary", authenticate, adminOnly, getStockMovementSummary);

export default router;
