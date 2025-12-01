import { Router } from "express";
import {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  adjustStock,
} from "../controllers/inventory.controller";

const router = Router();

router.get("/", getAllInventory);
router.get("/:id", getInventoryById);
router.post("/", createInventory);
router.put("/:id", updateInventory);
router.delete("/:id", deleteInventory);
router.patch("/:id/adjust", adjustStock);

export default router;
