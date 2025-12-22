import { Response } from "express";
import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateObjectId } from "./auth.controller";

export const cartItemValidation = [
  // Accept both flat and nested 'data.product_id' and 'quantity'
  body().custom((value, { req }) => {
    const body = req.body.data ? req.body.data : req.body;
    const product_id = body.product_id;
    // Accept both 24-char Mongo IDs and 36-char UUIDs
    const isMongoId = typeof product_id === 'string' && /^[a-fA-F0-9]{24}$/.test(product_id);
    const isUUID = typeof product_id === 'string' && product_id.length === 36;
    if (!isMongoId && !isUUID) {
      throw new Error('Valid product ID is required (24-char MongoID or 36-char UUID)');
    }
    return true;
  }),
  body().custom((value, { req }) => {
    const body = req.body.data ? req.body.data : req.body;
    const quantity = body.quantity;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }
    return true;
  }),
];

export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci._id, ci.user_id, ci.product_id, ci.quantity, ci.size, ci.color, ci.created_at,
        p.name as product_name, p.price as product_price, p.image as product_image, p.stock as product_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p._id
       WHERE ci.user_id = ?
       ORDER BY ci.created_at DESC`,
      [req.user_id]
    );

    // Calculate cart summary
    const subtotal = items.reduce(
      (sum, item) => sum + (item.product_price ?? 0) * item.quantity,
      0
    );
    const shipping = subtotal > 0 ? (subtotal > 100 ? 0 : 10) : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    res.json({
      data: {
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        shipping,
        tax,
        total,
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getCartItemById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci._id, ci.user_id, ci.product_id, ci.quantity, ci.size, ci.color, ci.created_at,
        p.name as product_name, p.price as product_price, p.image as product_image, p.stock as product_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p._id
       WHERE ci._id = ?`,
      [id]
    );
    if (items.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    res.json({ data: items[0], success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    // Support both flat and nested 'data' payloads
    const body = req.body.data ? req.body.data : req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0]?.msg || "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { product_id, quantity, size, color } = body;

    // Check if product exists and has enough stock
    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT _id, stock FROM products WHERE _id = ?",
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        error: "Product not found",
        code: "PRODUCT_NOT_FOUND",
      });
    }

    const product = products[0];
    if (product.stock < quantity) {
      return res.status(400).json({
        error: "Insufficient stock",
        code: "INSUFFICIENT_STOCK",
      });
    }

    // Check authentication
    if (!req.user_id) {
      return res.status(401).json({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    // Check if item already exists in cart
    const [existingItems] = await pool.query<RowDataPacket[]>(
      'SELECT _id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND COALESCE(size, "") = ? AND COALESCE(color, "") = ?',
      [req.user_id, product_id, size || "", color || ""]
    );

    if (existingItems.length > 0) {
      // Update existing item
      const newQuantity = existingItems[0].quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({
          error: "Insufficient stock",
          code: "INSUFFICIENT_STOCK",
        });
      }
      await pool.query("UPDATE cart_items SET quantity = ? WHERE _id = ?", [
        newQuantity,
        existingItems[0]._id,
      ]);
    } else {
      const newId = generateObjectId();
      await pool.query<ResultSetHeader>(
        "INSERT INTO cart_items (_id, user_id, product_id, quantity, size, color) VALUES (?, ?, ?, ?, ?, ?)",
        [newId, req.user_id, product_id, quantity, size || null, color || null]
      );
    }
    // Always return the full updated cart as an object
    const [cartItems] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci._id, ci.user_id, ci.product_id, ci.quantity, ci.size, ci.color, ci.created_at,
        p.name as product_name, p.price as product_price, p.image as product_image, p.stock as product_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p._id
       WHERE ci.user_id = ?
       ORDER BY ci.created_at DESC`,
      [req.user_id]
    );
    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.product_price ?? 0) * item.quantity,
      0
    );
    const shipping = subtotal > 0 ? (subtotal > 100 ? 0 : 10) : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    res.status(201).json({
      data: {
        items: cartItems,
        totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        shipping,
        tax,
        total,
      },
      success: true,
    });
  } catch (error) {
    console.error("addToCart error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error,
    });
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    if (!id || typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ error: "Invalid cart item ID" });
    }
    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }
    // Check if cart item belongs to user
    const [cartItemRows] = await pool.query<RowDataPacket[]>(
      "SELECT ci._id, ci.product_id, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p._id WHERE ci._id = ? AND ci.user_id = ?",
      [id, req.user_id]
    );
    if (cartItemRows.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    const cartItem = cartItemRows[0];
    if (cartItem.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }
    await pool.query("UPDATE cart_items SET quantity = ? WHERE _id = ?", [
      quantity,
      id,
    ]);

    // After update, return the full cart as an object
    const [allCartItems] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci._id, ci.user_id, ci.product_id, ci.quantity, ci.size, ci.color, ci.created_at,
        p.name as product_name, p.price as product_price, p.image as product_image, p.stock as product_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p._id
       WHERE ci.user_id = ?
       ORDER BY ci.created_at DESC`,
      [req.user_id]
    );
    const subtotal = allCartItems.reduce(
      (sum, item) => sum + (item.product_price ?? 0) * item.quantity,
      0
    );
    const shipping = subtotal > 0 ? (subtotal > 100 ? 0 : 10) : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    res.json({
      data: {
        items: allCartItems,
        totalItems: allCartItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        shipping,
        tax,
        total,
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ error: "Invalid cart item ID" });
    }
    // First check if the cart item exists
    const [checkItems] = await pool.query<RowDataPacket[]>(
      "SELECT _id, user_id FROM cart_items WHERE _id = ?",
      [id]
    );
    if (checkItems.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    if (checkItems[0].user_id !== req.user_id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM cart_items WHERE _id = ?",
      [id]
    );

    // After remove, return the full cart as an object
    const [allCartItems] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci._id, ci.user_id, ci.product_id, ci.quantity, ci.size, ci.color, ci.created_at,
        p.name as product_name, p.price as product_price, p.image as product_image, p.stock as product_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p._id
       WHERE ci.user_id = ?
       ORDER BY ci.created_at DESC`,
      [req.user_id]
    );
    const subtotal = allCartItems.reduce(
      (sum, item) => sum + (item.product_price ?? 0) * item.quantity,
      0
    );
    const shipping = subtotal > 0 ? (subtotal > 100 ? 0 : 10) : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    res.json({
      data: {
        items: allCartItems,
        totalItems: allCartItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        shipping,
        tax,
        total,
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    await pool.query("DELETE FROM cart_items WHERE user_id = ?", [req.user_id]);

    // After clear, return an empty cart object
    res.json({
      data: {
        items: [],
        totalItems: 0,
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0,
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
