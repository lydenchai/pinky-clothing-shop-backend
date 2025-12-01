import { Router } from "express";
import {
  logAnalyticsEvent,
  getAnalytics,
} from "../controllers/analytics.controller";

const router = Router();

router.post("/", logAnalyticsEvent);
router.get("/", getAnalytics);

export default router;
