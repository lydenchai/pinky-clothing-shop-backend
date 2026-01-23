import { Router } from "express";
import {
  getSiteInfo,
  updateSiteInfo,
} from "../controllers/site-info.controller";

const router = Router();

// Get site information
router.get("/", getSiteInfo);

// Update site information
router.patch("/update", updateSiteInfo);

export default router;
