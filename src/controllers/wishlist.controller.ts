import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { pool } from "../config/database";
import { RowDataPacket } from "mysql2";
import { generateObjectId } from "./auth.controller";

export const getUserWishlist = async (req: AuthRequest, res: Response) => {
  try {
    let { page, limit } = req.query;
    // Pagination parameters
    const currentPage = parseInt(page as string) || 1;
    const itemsPerPage = parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    const user_id = req.user_id;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });

    // Total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM wishlist WHERE user_id = ?`,
      [user_id]
    );
    const total =
      Array.isArray(countRows) && (countRows as any)[0]
        ? (countRows as any)[0].total
        : 0;
    const [wishlist] = await pool.query<RowDataPacket[]>(
      `SELECT products.* FROM wishlist
       JOIN products ON wishlist.product_id = products._id
       WHERE wishlist.user_id = ?
       LIMIT ? OFFSET ?`,
      [user_id, Number(itemsPerPage), Number(offset)]
    );
    res.json({
      success: true,
      data: wishlist,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems: total,
        totalPages: Math.ceil(total / itemsPerPage),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
};

export const addProductToWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user_id;
    const _id = req.body._id || generateObjectId();
    // Accept both { product_id } and { data: product_id } payloads
    let product_id = req.body.product_id;
    if (!product_id && req.body.data) product_id = req.body.data;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });
    if (!product_id)
      return res.status(400).json({ error: "Missing product_id" });
    const [result] = await pool.query(
      `INSERT INTO wishlist (_id, user_id, product_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [_id, user_id, product_id]
    );
    res.status(201).json({
      success: true,
    });
  } catch (error) {
    console.error("Wishlist add error:", error);
    res.status(500).json({
      error: "Failed to add to wishlist",
      details: error instanceof Error ? error.message : error,
    });
  }
};

export const removeProductFromWishlist = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user_id = req.user_id;
    const { product_id } = req.body;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });
    if (!product_id)
      return res.status(400).json({ error: "Missing product_id" });
    await pool.query(
      `DELETE FROM wishlist WHERE user_id = ? AND product_id = ?`,
      [user_id, product_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Wishlist remove error:", error);
    res.status(500).json({
      error: "Failed to remove from wishlist",
      details: error instanceof Error ? error.message : error,
    });
  }
};
