import { Response } from "express";
import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";

export const cartItemValidation = [
  body("productId")
    .isInt({ min: 1 })
    .withMessage("Valid product ID is required"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci.id, ci.userId, ci.productId, ci.quantity, ci.size, ci.color, ci.createdAt,
        p.name as productName, p.price as productPrice, p.imageUrl as productImage, p.stock as productStock
       FROM cart_items ci
       JOIN products p ON ci.productId = p.id
       WHERE ci.userId = ?
       ORDER BY ci.createdAt DESC`,
      [req.userId]
    );

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity, size, color } = req.body;

    // Check if product exists and has enough stock
    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT id, stock FROM products WHERE id = ?",
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = products[0];
    if (product.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // Check if item already exists in cart
    const [existingItems] = await pool.query<RowDataPacket[]>(
      'SELECT id, quantity FROM cart_items WHERE userId = ? AND productId = ? AND COALESCE(size, "") = ? AND COALESCE(color, "") = ?',
      [req.userId, productId, size || "", color || ""]
    );

    if (existingItems.length > 0) {
      // Update existing item
      const newQuantity = existingItems[0].quantity + quantity;

      if (product.stock < newQuantity) {
        return res.status(400).json({ error: "Insufficient stock" });
      }

      await pool.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [
        newQuantity,
        existingItems[0].id,
      ]);

      const [updatedItems] = await pool.query<RowDataPacket[]>(
        `SELECT 
          ci.id, ci.userId, ci.productId, ci.quantity, ci.size, ci.color, ci.createdAt,
          p.name as productName, p.price as productPrice, p.imageUrl as productImage, p.stock as productStock
         FROM cart_items ci
         JOIN products p ON ci.productId = p.id
         WHERE ci.id = ?`,
        [existingItems[0].id]
      );

      return res.json(updatedItems[0]);
    }

    // Create new cart item
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO cart_items (userId, productId, quantity, size, color) VALUES (?, ?, ?, ?, ?)",
      [req.userId, productId, quantity, size || null, color || null]
    );

    const [newItems] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci.id, ci.userId, ci.productId, ci.quantity, ci.size, ci.color, ci.createdAt,
        p.name as productName, p.price as productPrice, p.imageUrl as productImage, p.stock as productStock
       FROM cart_items ci
       JOIN products p ON ci.productId = p.id
       WHERE ci.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newItems[0]);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid cart item ID" });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    // Check if cart item belongs to user
    const [cartItems] = await pool.query<RowDataPacket[]>(
      "SELECT ci.id, ci.productId, p.stock FROM cart_items ci JOIN products p ON ci.productId = p.id WHERE ci.id = ? AND ci.userId = ?",
      [itemId, req.userId]
    );

    if (cartItems.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const cartItem = cartItems[0];
    if (cartItem.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    await pool.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [
      quantity,
      itemId,
    ]);

    const [updatedItems] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci.id, ci.userId, ci.productId, ci.quantity, ci.size, ci.color, ci.createdAt,
        p.name as productName, p.price as productPrice, p.imageUrl as productImage, p.stock as productStock
       FROM cart_items ci
       JOIN products p ON ci.productId = p.id
       WHERE ci.id = ?`,
      [itemId]
    );

    res.json(updatedItems[0]);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid cart item ID" });
    }

    // First check if the cart item exists
    const [checkItems] = await pool.query<RowDataPacket[]>(
      "SELECT id, userId FROM cart_items WHERE id = ?",
      [itemId]
    );

    if (checkItems.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (checkItems[0].userId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM cart_items WHERE id = ?",
      [itemId]
    );

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    await pool.query("DELETE FROM cart_items WHERE userId = ?", [req.userId]);

    res.json({ message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
