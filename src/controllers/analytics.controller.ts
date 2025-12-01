import { Request, Response } from 'express';
import { pool } from '../config/database';

export const logAnalyticsEvent = async (req: Request, res: Response) => {
  try {
    const { type, userId, data } = req.body;
    await pool.query(
      'INSERT INTO analytics (type, userId, data) VALUES (?, ?, ?)',
      [type, userId || null, data ? JSON.stringify(data) : null]
    );
    res.status(201).json({ message: 'Analytics event logged' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to log analytics event', error: err });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM analytics ORDER BY createdAt DESC LIMIT 100');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: err });
  }
};
