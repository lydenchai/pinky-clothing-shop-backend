import { Router } from "express";
import {
  getAllShippings,
  getShippingById,
  createShipping,
  updateShipping,
  deleteShipping,
} from "../controllers/shipping.controller";

const router = Router();

router.get("/", getAllShippings);
router.get("/find/:id", getShippingById);
router.post("/create", createShipping);
router.patch("/update/:id", updateShipping);
router.delete("/delete/:id", deleteShipping);

export default router;
