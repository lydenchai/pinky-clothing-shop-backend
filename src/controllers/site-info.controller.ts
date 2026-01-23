import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { pool } from "../config/database";
import { RowDataPacket } from "mysql2";

// Get site information
export const getSiteInfo = async (req: AuthRequest, res: Response) => {
  try {
    const [info] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM site_info LIMIT 1`,
    );
    res.json({ success: true, data: info[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to get site info" });
    console.error(err);
  }
};

// Update site information
export const updateSiteInfo = async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(`UPDATE site_info SET ?`, [req.body]);
    const [info] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM site_info LIMIT 1`,
    );
    res.json({ success: true, data: info[0] });
  } catch (err) {
    console.error("Site info update error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update site info" });
  }
};
