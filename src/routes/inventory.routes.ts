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
router.get("/find/:id", getInventoryById);
router.post("/create", createInventory);
router.patch("/update/:id/", updateInventory);
router.delete("/delete/:id", deleteInventory);
router.patch("/update/:id/adjust", adjustStock);

export default router;
