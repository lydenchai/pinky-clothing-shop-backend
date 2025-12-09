import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All order routes require authentication
router.use(authenticate);

router.post("/", orderController.orderValidation, orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrderById);
router.put("/:id/status", orderController.updateOrderStatus);
router.post(
  "/summary",
  orderController.orderValidation,
  orderController.getOrderSummary
);

export default router;
