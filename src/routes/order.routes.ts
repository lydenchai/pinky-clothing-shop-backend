import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All order routes require authentication
router.use(authenticate);

//  Create a new order
router.post( "/create",  orderController.orderValidation,  orderController.createOrder );

// Get all orders (admin only)
router.get("/", orderController.getOrders);

// Get orders for the authenticated user
router.get("/user-orders", orderController.getUserOrders);

// Get, update specific order by ID
router.get("/find/:id", orderController.getOrderById);

// Update order status (admin only)
router.patch("/update/:id/status", orderController.updateOrderStatus);

// Get order summary (admin only)
router.post( "/summary", orderController.orderValidation, orderController.getOrderSummary );

export default router;
