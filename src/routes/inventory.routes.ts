import { Router } from "express";

import {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  adjustStock,
} from "../controllers/inventory.controller";
import { authenticate, adminOnly } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getAllInventory);
router.get("/find/:id", getInventoryById);
router.post("/create", authenticate, adminOnly, createInventory);
router.patch("/update/:id/", authenticate, adminOnly, updateInventory);
router.delete("/delete/:id", authenticate, adminOnly, deleteInventory);
router.patch("/update/:id/adjust", authenticate, adminOnly, adjustStock);

export default router;
