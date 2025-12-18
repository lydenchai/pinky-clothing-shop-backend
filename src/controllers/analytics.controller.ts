import { Request, Response } from "express";
import { pool } from "../config/database";

export const logAnalyticsEvent = async (req: Request, res: Response) => {
  try {
    const { type, user_id, data } = req.body;
    await pool.query(
      "INSERT INTO analytics (type, user_id, data) VALUES (?, ?, ?)",
      [type, user_id || null, data ? JSON.stringify(data) : null]
    );
    res.status(201).json({ data: null, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to log analytics event", error: err });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM analytics ORDER BY created_at DESC LIMIT 100"
    );
    res.json({ data: rows, success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch analytics", error: err });
  }
};
