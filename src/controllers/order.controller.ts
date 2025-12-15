// Get all orders for admin
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10) || 1;
    const limit = parseInt((req.query.limit as string) || "15", 10) || 15;
    const offset = (page - 1) * limit;

    // total orders
    const [countRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM orders"
    );
    const total =
      Array.isArray(countRows) && (countRows as any)[0]
        ? (countRows as any)[0].total
        : 0;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.id AS orderId, o.*, oi.id AS itemId, oi.productId, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS productName, p.image AS productImage,
              u.email AS userEmail, u.firstName AS userFirstName, u.lastName AS userLastName
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.orderId
         LEFT JOIN products p ON oi.productId = p.id
         LEFT JOIN users u ON o.userId = u.id
         ORDER BY o.updatedAt DESC, o.id DESC
         LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const map: any = {};
    rows.forEach((row) => {
      if (!map[row.orderId]) {
        map[row.orderId] = {
          id: row.orderId,
          userId: row.userId,
          userEmail: row.userEmail,
          userFirstName: row.userFirstName,
          userLastName: row.userLastName,
          totalAmount: row.totalAmount,
          status: row.status,
          shippingAddress: row.shippingAddress,
          shippingCity: row.shippingCity,
          shippingPostalCode: row.shippingPostalCode,
          shippingCountry: row.shippingCountry,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          items: [],
        };
      }
      if (row.itemId) {
        map[row.orderId].items.push({
          id: row.itemId,
          productId: row.productId,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          productName: row.productName,
          productImage: row.productImage,
        });
      }
    });

    res.json({
      data: Object.values(map),
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getAllOrders error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
import { Response } from "express";
import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";

// ...existing imports...

/* ----------------------------- VALIDATION ----------------------------- */
export const orderValidation = [
  body("address").custom((value) => {
    if (!value) throw new Error("Address is required");
    const required = [
      "street",
      "house",
      "village",
      "commune",
      "district",
      "province",
      "country",
    ];
    for (const key of required) {
      if (!value[key]) throw new Error(`Address field '${key}' is required`);
    }
    return true;
  }),
];

/* ----------------------------- CREATE ORDER --------------------------- */
export const createOrder = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let shippingAddress = "",
      shippingCity = "",
      shippingPostalCode = "",
      shippingCountry = "";
    if (req.body.address) {
      const a = req.body.address;
      shippingAddress = `${a.house || ""} ${a.street || ""} ${
        a.village || ""
      } ${a.commune || ""} ${a.district || ""} ${a.province || ""}`.trim();
      shippingCity = a.province || "";
      shippingPostalCode = a.postalCode || "";
      shippingCountry = a.country || "Cambodia";
    } else {
      shippingAddress = req.body.shippingAddress;
      shippingCity = req.body.shippingCity;
      shippingPostalCode = req.body.shippingPostalCode;
      shippingCountry = req.body.shippingCountry;
    }
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

    // Calculate total & validate stock
    let totalAmount = 0;
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
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

    // Insert items + update stock
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

    // Fetch order with items
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT o.id AS orderId, o.*, oi.id AS itemId, oi.productId, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS productName, p.image AS productImage
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.orderId
         LEFT JOIN products p ON oi.productId = p.id
         WHERE o.id = ?`,
      [orderId]
    );
    if (!rows.length) return res.status(404).json({ error: "Order not found" });

    const order: any = {
      id: rows[0].orderId,
      userId: rows[0].userId,
      totalAmount: rows[0].totalAmount,
      status: rows[0].status,
      shippingAddress: rows[0].shippingAddress,
      shippingCity: rows[0].shippingCity,
      shippingPostalCode: rows[0].shippingPostalCode,
      shippingCountry: rows[0].shippingCountry,
      createdAt: rows[0].createdAt,
      updatedAt: rows[0].updatedAt,
      items: [],
    };
    rows.forEach((row) => {
      if (row.itemId) {
        order.items.push({
          id: row.itemId,
          productId: row.productId,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          productName: row.productName,
          productImage: row.productImage,
        });
      }
    });
    res.status(201).json(order);
  } catch (error) {
    await connection.rollback();
    console.error("createOrder error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
};

/* ------------------------------ GET ORDERS ---------------------------- */
export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM users WHERE id = ?",
      [req.userId]
    );
    const isAdmin = userRows.length && userRows[0].role === "admin";
    let query = `SELECT o.id AS orderId, o.*, oi.id AS itemId, oi.productId, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS productName, p.image AS productImage
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.orderId
         LEFT JOIN products p ON oi.productId = p.id`;
    let params: any[] = [];
    if (!isAdmin) {
      query += " WHERE o.userId = ?";
      params.push(req.userId);
    }
    // pagination
    const page = parseInt((req.query.page as string) || "1", 10) || 1;
    const limit = parseInt((req.query.limit as string) || "15", 10) || 15;
    const offset = (page - 1) * limit;

    // count total with same filter
    let countQuery = "SELECT COUNT(DISTINCT o.id) as total FROM orders o";
    const countParams: any[] = [];
    if (!isAdmin) {
      countQuery += " WHERE o.userId = ?";
      countParams.push(req.userId);
    }
    const [countRows] = await pool.query<RowDataPacket[]>(
      countQuery,
      countParams
    );
    const total =
      Array.isArray(countRows) && (countRows as any)[0]
        ? (countRows as any)[0].total
        : 0;

    query += " ORDER BY o.updatedAt DESC, o.id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    const map: any = {};
    rows.forEach((row) => {
      if (!map[row.orderId]) {
        map[row.orderId] = {
          id: row.orderId,
          userId: row.userId,
          totalAmount: row.totalAmount,
          status: row.status,
          shippingAddress: row.shippingAddress,
          shippingCity: row.shippingCity,
          shippingPostalCode: row.shippingPostalCode,
          shippingCountry: row.shippingCountry,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          items: [],
        };
      }
      if (row.itemId) {
        map[row.orderId].items.push({
          id: row.itemId,
          productId: row.productId,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          productName: row.productName,
          productImage: row.productImage,
        });
      }
    });

    res.json({
      data: Object.values(map),
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getOrders error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/* ---------------------------- GET ORDER BY ID ------------------------- */
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Check if user is admin
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM users WHERE id = ?",
      [req.userId]
    );
    const isAdmin = userRows.length && userRows[0].role === "admin";
    let query = `SELECT o.id AS orderId, o.*, oi.id AS itemId, oi.productId, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS productName, p.image AS productImage
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.orderId
         LEFT JOIN products p ON oi.productId = p.id
         WHERE o.id = ?`;
    let params: any[] = [id];
    if (!isAdmin) {
      query += " AND o.userId = ?";
      params.push(req.userId);
    }
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    if (!rows.length) return res.status(404).json({ error: "Order not found" });

    const order: any = {
      id: rows[0].orderId,
      userId: rows[0].userId,
      totalAmount: rows[0].totalAmount,
      status: rows[0].status,
      shippingAddress: rows[0].shippingAddress,
      shippingCity: rows[0].shippingCity,
      shippingPostalCode: rows[0].shippingPostalCode,
      shippingCountry: rows[0].shippingCountry,
      createdAt: rows[0].createdAt,
      updatedAt: rows[0].updatedAt,
      items: [],
    };
    rows.forEach((row) => {
      if (row.itemId) {
        order.items.push({
          id: row.itemId,
          productId: row.productId,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          productName: row.productName,
          productImage: row.productImage,
        });
      }
    });
    res.json(order);
  } catch (error) {
    console.error("getOrderById error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/* --------------------------- UPDATE ORDER STATUS ---------------------- */
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    // Determine if the requester is an admin. Admins may update any order.
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM users WHERE id = ?",
      [req.userId]
    );
    const isAdmin = userRows.length && userRows[0].role === "admin";

    let query: string;
    let params: any[];
    if (isAdmin) {
      query = `UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ?`;
      params = [status, id];
    } else {
      query = `UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ? AND userId = ?`;
      params = [status, id, req.userId];
    }

    const [result] = await pool.query<ResultSetHeader>(query, params);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Order not found or permission denied" });
    }
    // Return the full order object (including items) so frontend keeps rendering correctly
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.id AS orderId, o.*, oi.id AS itemId, oi.productId, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS productName, p.image AS productImage
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.orderId
         LEFT JOIN products p ON oi.productId = p.id
         WHERE o.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Order not found" });
    const order: any = {
      id: rows[0].orderId,
      userId: rows[0].userId,
      totalAmount: rows[0].totalAmount,
      status: rows[0].status,
      shippingAddress: rows[0].shippingAddress,
      shippingCity: rows[0].shippingCity,
      shippingPostalCode: rows[0].shippingPostalCode,
      shippingCountry: rows[0].shippingCountry,
      createdAt: rows[0].createdAt,
      updatedAt: rows[0].updatedAt,
      items: [],
    };
    rows.forEach((row) => {
      if (row.itemId) {
        order.items.push({
          id: row.itemId,
          productId: row.productId,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          productName: row.productName,
          productImage: row.productImage,
        });
      }
    });
    res.json(order);
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/* --------------------------- ORDER SUMMARY ---------------------------- */
export const orderSummaryValidation = orderValidation;

export const orderSummary = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let shippingAddress = "",
      shippingCity = "",
      shippingPostalCode = "",
      shippingCountry = "";
    if (req.body.address) {
      const a = req.body.address;
      shippingAddress = `${a.house || ""} ${a.street || ""} ${
        a.village || ""
      } ${a.commune || ""} ${a.district || ""} ${a.province || ""}`.trim();
      shippingCity = a.province || "";
      shippingPostalCode = a.postalCode || "";
      shippingCountry = a.country || "Cambodia";
    } else {
      shippingAddress = req.body.shippingAddress;
      shippingCity = req.body.shippingCity;
      shippingPostalCode = req.body.shippingPostalCode;
      shippingCountry = req.body.shippingCountry;
    }
    const [cartItems] = await pool.query<RowDataPacket[]>(
      `SELECT ci.productId, ci.quantity, ci.size, ci.color, p.price, p.stock, p.name AS productName, p.image AS productImage
         FROM cart_items ci
         JOIN products p ON ci.productId = p.id
         WHERE ci.userId = ?`,
      [req.userId]
    );
    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }
    let subtotal = 0;
    const outOfStock: any[] = [];
    const items = cartItems.map((item) => {
      if (item.stock < item.quantity) {
        outOfStock.push({
          productId: item.productId,
          productName: item.productName,
        });
      }
      subtotal += item.price * item.quantity;
      return {
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        stock: item.stock,
      };
    });
    if (outOfStock.length > 0) {
      return res
        .status(400)
        .json({ error: "Some items are out of stock", outOfStock });
    }
    const shipping = subtotal > 100 ? 0 : 10;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    res.json({
      items,
      subtotal,
      shipping,
      tax,
      total,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingCountry,
    });
  } catch (error) {
    console.error("orderSummary error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Order summary endpoint for frontend confirmation
export const getOrderSummary = async (req: AuthRequest, res: Response) => {
  try {
    const {
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingCountry,
    } = req.body;

    // Get cart items for user
    const [cartItems] = await pool.query<RowDataPacket[]>(
      `SELECT ci.productId, ci.quantity, ci.size, ci.color, p.price, p.name, p.image
       FROM cart_items ci
       JOIN products p ON ci.productId = p.id
       WHERE ci.userId = ?`,
      [req.userId]
    );
    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total
    let totalAmount = 0;
    for (const item of cartItems) {
      totalAmount += item.price * item.quantity;
    }

    // Return summary
    res.json({
      items: cartItems,
      total: totalAmount,
      shipping: {
        address: shippingAddress,
        city: shippingCity,
        postalCode: shippingPostalCode,
        country: shippingCountry,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to prepare order summary" });
  }
};
