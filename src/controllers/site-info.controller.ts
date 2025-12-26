import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { pool } from "../config/database";
import { RowDataPacket } from "mysql2";

export const getSiteInfo = async (req: AuthRequest, res: Response) => {
  try {
    const [info] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM site_info LIMIT 1`
    );
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to get site info" });
  }
};

export const updateSiteInfo = async (req: AuthRequest, res: Response) => {
  try {
    const updated = await pool.query(`UPDATE site_info SET ? WHERE id = 1`, [
      req.body,
    ]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to update site info" });
  }
};
