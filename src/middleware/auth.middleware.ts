export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Assume req.userId is set by authenticate middleware
  // Query user role from database
  import("../config/database").then(({ pool }) => {
    pool
      .query("SELECT role FROM users WHERE id = ?", [req.userId])
      .then(([rows]: any) => {
        if (rows.length && rows[0].role === "admin") {
          next();
        } else {
          res.status(403).json({ error: "Admin access required" });
        }
      })
      .catch(() =>
        res.status(500).json({ error: "Failed to check admin role" })
      );
  });
};
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthRequest extends Request {
  userId?: number;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };
    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
