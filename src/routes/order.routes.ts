import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);
router.post(
  "/create",
  orderController.orderValidation,
  orderController.createOrder
);
router.get("/", orderController.getOrders);
router.get("/user-orders", orderController.getUserOrders);
router.get("/find/:id", orderController.getOrderById);
router.patch("/update/:id/status", orderController.updateOrderStatus);
router.post(
  "/summary",
  orderController.orderValidation,
  orderController.getOrderSummary
);

export default router;
