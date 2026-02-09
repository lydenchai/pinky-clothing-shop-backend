import { Request, Response } from "express";
import { Analytics } from "../models/Analytics";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Op, fn, col, literal } from "sequelize";

// Log an analytics event
export const logAnalyticsEvent = async (req: Request, res: Response) => {
  try {
    const { type, user_id, data } = req.body;
    await Analytics.create({
        type,
        user_id: user_id || null,
        data: data ? JSON.stringify(data) : null
    });
    res.status(201).json({ data: null, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to log analytics event", error: err });
  }
};

// Get recent analytics events (admin only)
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const rows = await Analytics.findAll({
        order: [['created_at', 'DESC']],
        limit: 100
    });
    res.json({ data: rows, success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch analytics", error: err });
  }
};

// Admin analytics summary: total sales, orders, users, products, sales by day
export const getAnalyticsSummary = async (req: Request, res: Response) => {
  try {
    const statusFilter = {
        status: {
            [Op.in]: ['pending','processing','shipped','delivered']
        }
    };

    // Total sales (sum of all order totals for placed orders)
    const totalSales = await Order.sum('total_amount', { where: statusFilter }) || 0;

    // Total orders (only placed orders, not cancelled)
    const totalOrders = await Order.count({ where: statusFilter });

    // Total users
    const totalUsers = await User.count();

    // Total products
    const totalProducts = await Product.count();

    // Sales by day (for chart, last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByDayRows = await Order.findAll({
        attributes: [
            [fn('DATE', col('created_at')), 'date'],
            [fn('SUM', col('total_amount')), 'sales']
        ],
        where: {
            ...statusFilter,
            created_at: {
                [Op.gte]: thirtyDaysAgo
            }
        },
        group: [fn('DATE', col('created_at'))],
        order: [[literal('date'), 'ASC']]
    });

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
