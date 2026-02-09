import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Wishlist } from "../models/Wishlist";
import { Product } from "../models/Product";
import { generateObjectId } from "../utils/objectid.util";

// Get wishlist for the authenticated user with pagination
export const getUserWishlist = async (req: AuthRequest, res: Response) => {
  try {
    let { page, limit } = req.query;
    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;
    const user_id = req.user_id;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });
    const { count, rows } = await Wishlist.findAndCountAll({
      where: { user_id },
      include: [{
        model: Product
      }],
      limit: itemsPerPage,
      offset: offset
    });
    const data = rows.map(item => item.product);
    res.json({
      success: true,
      data,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems: count,
        totalPages: Math.ceil(count / itemsPerPage),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch wishlist" });
    console.error(error);
  }
};

// Add product to wishlist
export const addProductToWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user_id;
    const _id = req.body._id || generateObjectId();
    let product_id = req.body.product_id;
    if (!product_id && req.body.data) product_id = req.body.data;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });
    if (!product_id)
      return res.status(400).json({ error: "Missing product_id" });
    await Wishlist.findOrCreate({
      where: { user_id, product_id },
      defaults: { _id, user_id, product_id }
    });
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

// Remove product from wishlist
export const removeProductFromWishlist = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const user_id = req.user_id;
    const { product_id } = req.body;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });
    if (!product_id)
      return res.status(400).json({ error: "Missing product_id" });
    await Wishlist.destroy({
      where: { user_id, product_id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Wishlist remove error:", error);
    res.status(500).json({
      error: "Failed to remove from wishlist",
      details: error instanceof Error ? error.message : error,
    });
  }
};
