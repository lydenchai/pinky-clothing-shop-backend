import { Router } from "express";
import {
  logAnalyticsEvent,
  getAnalytics,
  getAnalyticsSummary,
} from "../controllers/analytics.controller";

const router = Router();

router.post("/", logAnalyticsEvent);
router.get("/", getAnalytics);

// Admin summary endpoint
router.get("/summary", getAnalyticsSummary);

export default router;
