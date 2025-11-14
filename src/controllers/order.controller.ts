import { Response } from "express";
import { pool } from "../config/database";
import { Order, OrderItem, OrderWithItems } from "../models/order.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";

export const orderValidation = [
  body("shippingAddress")
    .notEmpty()
    .withMessage("Shipping address is required"),
  body("shippingCity").notEmpty().withMessage("Shipping city is required"),
  body("shippingPostalCode").notEmpty().withMessage("Postal code is required"),
  body("shippingCountry").notEmpty().withMessage("Country is required"),
];

export const createOrder = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingCountry,
    } = req.body;

    await connection.beginTransaction();

    // Get cart items
    const [cartItems] = await connection.query<RowDataPacket[]>(
      `SELECT ci.productId, ci.quantity, ci.size, ci.color, p.price, p.stock
       FROM cart_items ci
       JOIN products p ON ci.productId = p.id
       WHERE ci.userId = ?`,
      [req.userId]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Verify stock and calculate total
    let totalAmount = 0;
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        await connection.rollback();
        return res
          .status(400)
          .json({
            error: `Insufficient stock for product ID ${item.productId}`,
          });
      }
      totalAmount += item.price * item.quantity;
    }

    // Create order
    const [orderResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO orders (userId, totalAmount, status, shippingAddress, shippingCity, shippingPostalCode, shippingCountry)
       VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
      [
        req.userId,
        totalAmount,
        shippingAddress,
        shippingCity,
        shippingPostalCode,
        shippingCountry,
      ]
    );

    const orderId = orderResult.insertId;

    // Create order items and update product stock
    for (const item of cartItems) {
      await connection.query(
        `INSERT INTO order_items (orderId, productId, quantity, price, size, color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.quantity,
          item.price,
          item.size || null,
          item.color || null,
        ]
      );

      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.productId]
      );
    }

    // Clear cart
    await connection.query("DELETE FROM cart_items WHERE userId = ?", [
      req.userId,
    ]);

    await connection.commit();

    // Get created order with items
    const [orders] = await connection.query<RowDataPacket[]>(
      `SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.productId,
            'quantity', oi.quantity,
            'price', oi.price,
            'size', oi.size,
            'color', oi.color,
            'productName', p.name,
            'productImage', p.imageUrl
          )
        ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.orderId
       LEFT JOIN products p ON oi.productId = p.id
       WHERE o.id = ?
       GROUP BY o.id`,
      [orderId]
    );

    const order = orders[0];
    order.items = JSON.parse(order.items);

    res.status(201).json(order);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Server error" });
  } finally {
    connection.release();
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT o.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.productId,
            'quantity', oi.quantity,
            'price', oi.price,
            'size', oi.size,
            'color', oi.color,
            'productName', p.name,
            'productImage', p.imageUrl
          )
        ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.orderId
       LEFT JOIN products p ON oi.productId = p.id
       WHERE o.userId = ?
       GROUP BY o.id
       ORDER BY o.createdAt DESC`,
      [req.userId]
    );

    const ordersWithItems = orders.map((order) => ({
      ...order,
      items: JSON.parse(order.items),
    }));

    res.json(ordersWithItems);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT o.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'productId', oi.productId,
            'quantity', oi.quantity,
            'price', oi.price,
            'size', oi.size,
            'color', oi.color,
            'productName', p.name,
            'productImage', p.imageUrl
          )
        ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.orderId
       LEFT JOIN products p ON oi.productId = p.id
       WHERE o.id = ? AND o.userId = ?
       GROUP BY o.id`,
      [id, req.userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orders[0];
    order.items = JSON.parse(order.items);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE orders SET status = ? WHERE id = ? AND userId = ?",
      [status, id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const [orders] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    res.json(orders[0]);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
