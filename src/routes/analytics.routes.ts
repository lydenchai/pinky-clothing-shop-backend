
import { Router } from "express";
import {
  logAnalyticsEvent,
  getAnalytics,
  getAnalyticsSummary,
} from "../controllers/analytics.controller";
import { authenticate, adminOnly } from "../middleware/auth.middleware";
import { getTopSellingProducts, getLowStockReport } from "../controllers/analytics.controller";

const router = Router();

// Log an analytics event
router.post("/", logAnalyticsEvent);

// Get recent analytics events (admin only)
router.get("/", getAnalytics);

// Get analytics summary (admin only)
router.get("/summary", getAnalyticsSummary);

// Top-selling products
router.get("/top-selling-products", authenticate, adminOnly, getTopSellingProducts);

// Low stock report
router.get("/low-stock-report", authenticate, adminOnly, getLowStockReport);

export default router;
