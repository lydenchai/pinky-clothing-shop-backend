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

// Admin analytics summary: total sales, orders, users, products, sales by day
export const getAnalyticsSummary = async (req: Request, res: Response) => {
  try {
    // Total sales (sum of all order totals for placed orders)
    const [salesRows] = await pool.query<any[]>(
      "SELECT SUM(total_amount) as totalSales FROM orders WHERE status IN ('pending','processing','shipped','delivered')"
    );
    const totalSales = salesRows[0]?.totalSales || 0;

    // Total orders (only placed orders, not cancelled)
    const [orderRows] = await pool.query<any[]>(
      "SELECT COUNT(*) as totalOrders FROM orders WHERE status IN ('pending','processing','shipped','delivered')"
    );
    const totalOrders = orderRows[0]?.totalOrders || 0;

    // Total users
    const [userRows] = await pool.query<any[]>(
      "SELECT COUNT(*) as totalUsers FROM users"
    );
    const totalUsers = userRows[0]?.totalUsers || 0;

    // Total products
    const [productRows] = await pool.query<any[]>(
      "SELECT COUNT(*) as totalProducts FROM products"
    );
    const totalProducts = productRows[0]?.totalProducts || 0;

    // Sales by day (for chart, last 30 days)
    const [salesByDayRows] = await pool.query<any[]>(
      `SELECT DATE(created_at) as date, SUM(total_amount) as sales
       FROM orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       HAVING sales > 0
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: {
        totalSales,
        totalOrders,
        totalUsers,
        totalProducts,
        salesByDay: salesByDayRows,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch analytics summary", error: err });
  }
};
