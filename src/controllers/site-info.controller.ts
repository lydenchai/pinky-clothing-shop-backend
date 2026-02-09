import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { SiteInfo } from "../models/SiteInfo";

// Get site information
export const getSiteInfo = async (req: AuthRequest, res: Response) => {
  try {
    const info = await SiteInfo.findOne();
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to get site info" });
    console.error(err);
  }
};

// Update site information
export const updateSiteInfo = async (req: AuthRequest, res: Response) => {
  try {
    const info = await SiteInfo.findOne();
    if (info) {
      await info.update(req.body);
    } else {
      await SiteInfo.create(req.body);
    }

    const updatedInfo = await SiteInfo.findOne();
    res.json({ success: true, data: updatedInfo });
  } catch (err) {
    console.error("Site info update error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update site info" });
  }
};
