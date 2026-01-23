import { Router } from "express";
import {
  logAnalyticsEvent,
  getAnalytics,
  getAnalyticsSummary,
} from "../controllers/analytics.controller";

const router = Router();

// Log an analytics event
router.post("/", logAnalyticsEvent);

// Get recent analytics events (admin only)
router.get("/", getAnalytics);

// Get analytics summary (admin only)
router.get("/summary", getAnalyticsSummary);

export default router;
