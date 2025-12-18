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
      `SELECT o._id AS order_id, o.*, oi._id AS item_id, oi.product_id, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS product_name, p.image AS product_image,
              u.email AS userEmail, u.first_name AS userfirst_name, u.last_name AS userlast_name
         FROM orders o
         LEFT JOIN order_items oi ON o._id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p._id
         LEFT JOIN users u ON o.user_id = u._id
         ORDER BY o.updated_at DESC, o._id DESC
         LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const map: any = {};
    rows.forEach((row) => {
      if (!map[row.order_id]) {
        map[row.order_id] = {
          id: row.order_id,
          user_id: row.user_id,
          userEmail: row.userEmail,
          userfirst_name: row.userfirst_name,
          userlast_name: row.userlast_name,
          total_amount: row.total_amount,
          status: row.status,
          shippingAddress: row.shippingAddress,
          shippingCity: row.shippingCity,
          shippingpostal_code: row.shippingpostal_code,
          shippingCountry: row.shippingCountry,
          created_at: row.created_at,
          updated_at: row.updated_at,
          items: [],
        };
      }
      if (row.item_id) {
        map[row.order_id].items.push({
          id: row.item_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          product_name: row.product_name,
          product_image: row.product_image,
        });
      }
    });

    res.json({
      success: true,
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

/* ----------------------------- CREATE ORDER --------------------------- */
export const createOrder = async (req: AuthRequest, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let shipping_address = "",
      shipping_city = "",
      shipping_postal_code = "",
      shipping_country = "";
    if (req.body.address) {
      const a = req.body.address;
      shipping_address = `${a.house || ""} ${a.street || ""} ${
        a.village || ""
      } ${a.commune || ""} ${a.district || ""} ${a.province || ""}`.trim();
      shipping_city = a.province || "";
      shipping_postal_code = a.postal_code || "";
      shipping_country = a.country || "Cambodia";
    } else {
      shipping_address = req.body.shipping_address;
      shipping_city = req.body.shipping_city;
      shipping_postal_code = req.body.shipping_postal_code;
      shipping_country = req.body.shipping_country;
    }
    await connection.beginTransaction();

    // Get cart items
    const [cart_items] = await connection.query<RowDataPacket[]>(
      `SELECT ci.product_id, ci.quantity, ci.size, ci.color, p.price, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p._id
       WHERE ci.user_id = ?`,
      [req.user_id]
    );
    if (cart_items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total & validate stock
    let total_amount = 0;
    for (const item of cart_items) {
      if (item.stock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          error: `Insufficient stock for product ID ${item.product_id}`,
        });
      }
      total_amount += item.price * item.quantity;
    }

    // Create order
    const [orderResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO orders (user_id, total_amount, status, shipping_address, shipping_city, shipping_postal_code, shipping_country)
       VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
      [
        req.user_id,
        total_amount,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_country,
      ]
    );
    const order_id = orderResult.insert_id;

    // Insert items + update stock
    for (const item of cart_items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, size, color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          order_id,
          item.product_id,
          item.quantity,
          item.price,
          item.size || null,
          item.color || null,
        ]
      );
      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE _id = ?",
        [item.quantity, item.product_id]
      );
    }

    // Clear cart
    await connection.query("DELETE FROM cart_items WHERE user_id = ?", [
      req.user_id,
    ]);
    await connection.commit();

    // Fetch order with items
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT o._id AS order_id, o.*, oi._id AS item_id, oi.product_id, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS product_name, p.image AS product_image
         FROM orders o
         LEFT JOIN order_items oi ON o._id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p._id
         WHERE o._id = ?`,
      [order_id]
    );
    if (!rows.length) return res.status(404).json({ error: "Order not found" });

    const order: any = {
      id: rows[0].order_id,
      user_id: rows[0].user_id,
      total_amount: rows[0].total_amount,
      status: rows[0].status,
      shipping_address: rows[0].shipping_address,
      shipping_city: rows[0].shipping_city,
      shipping_postal_code: rows[0].shipping_postal_code,
      shipping_country: rows[0].shipping_country,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      items: [],
    };
    rows.forEach((row) => {
      if (row.item_id) {
        order.items.push({
          id: row.item_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          product_name: row.product_name,
          product_image: row.product_image,
        });
      }
    });
    res.status(201).json({ data: order, success: true });
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
      "SELECT role FROM users WHERE _id = ?",
      [req.user_id]
    );
    const isAdmin = userRows.length && userRows[0].role === "admin";
    let query = `SELECT o._id AS order_id, o.*, oi._id AS item_id, oi.product_id, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS product_name, p.image AS product_image
         FROM orders o
         LEFT JOIN order_items oi ON o._id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p._id`;
    let params: any[] = [];
    if (!isAdmin) {
      query += " WHERE o.user_id = ?";
      params.push(req.user_id);
    }
    // pagination
    const page = parseInt((req.query.page as string) || "1", 10) || 1;
    const limit = parseInt((req.query.limit as string) || "15", 10) || 15;
    const offset = (page - 1) * limit;

    // count total with same filter
    let countQuery = "SELECT COUNT(DISTINCT o._id) as total FROM orders o";
    const countParams: any[] = [];
    if (!isAdmin) {
      countQuery += " WHERE o.user_id = ?";
      countParams.push(req.user_id);
    }
    const [countRows] = await pool.query<RowDataPacket[]>(
      countQuery,
      countParams
    );
    const total =
      Array.isArray(countRows) && (countRows as any)[0]
        ? (countRows as any)[0].total
        : 0;

    query += " ORDER BY o.updated_at DESC, o._id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    const map: any = {};
    rows.forEach((row) => {
      if (!map[row.order_id]) {
        map[row.order_id] = {
          id: row.order_id,
          user_id: row.user_id,
          total_amount: row.total_amount,
          status: row.status,
          shipping_address: row.shipping_address,
          shipping_city: row.shipping_city,
          shipping_postal_code: row.shipping_postal_code,
          shipping_country: row.shipping_country,
          created_at: row.created_at,
          updated_at: row.updated_at,
          items: [],
        };
      }
      if (row.item_id) {
        map[row.order_id].items.push({
          id: row.item_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          product_name: row.product_name,
          product_image: row.product_image,
        });
      }
    });

    res.json({
      success: true,
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
    const { _id } = req.params;
    // Check if user is admin
    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM users WHERE _id = ?",
      [req.user_id]
    );
    const isAdmin = userRows.length && userRows[0].role === "admin";
    let query = `SELECT o._id AS order_id, o.*, oi._id AS item_id, oi.product_id, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS product_name, p.image AS product_image
         FROM orders o
         LEFT JOIN order_items oi ON o._id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p._id
         WHERE o._id = ?`;
    let params: any[] = [_id];
    if (!isAdmin) {
      query += " AND o.user_id = ?";
      params.push(req.user_id);
    }
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    if (!rows.length) return res.status(404).json({ error: "Order not found" });

    const order: any = {
      _id: rows[0].order_id,
      user_id: rows[0].user_id,
      total_amount: rows[0].total_amount,
      status: rows[0].status,
      shipping_address: rows[0].shipping_address,
      shipping_city: rows[0].shipping_city,
      shipping_postal_code: rows[0].shipping_postal_code,
      shipping_country: rows[0].shipping_country,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      items: [],
    };
    rows.forEach((row) => {
      if (row.item_id) {
        order.items.push({
          _id: row.item_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          product_name: row.product_name,
          product_image: row.product_image,
        });
      }
    });
    res.json({ data: order, success: true });
  } catch (error) {
    console.error("getOrderById error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/* --------------------------- UPDATE ORDER STATUS ---------------------- */
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { _id } = req.params;
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
      "SELECT role FROM users WHERE _id = ?",
      [req.user_id]
    );
    const isAdmin = userRows.length && userRows[0].role === "admin";

    let query: string;
    let params: any[];
    if (isAdmin) {
      query = `UPDATE orders SET status = ?, updated_at = NOW() WHERE _id = ?`;
      params = [status, _id];
    } else {
      query = `UPDATE orders SET status = ?, updated_at = NOW() WHERE _id = ? AND user_id = ?`;
      params = [status, _id, req.user_id];
    }

    const [result] = await pool.query<ResultSetHeader>(query, params);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Order not found or permission denied" });
    }
    // Return the full order object (including items) so frontend keeps rendering correctly
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o._id AS order_id, o.*, oi._id AS item_id, oi.product_id, oi.quantity, oi.price, oi.size, oi.color,
              p.name AS product_name, p.image AS product_image
         FROM orders o
         LEFT JOIN order_items oi ON o._id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p._id
         WHERE o._id = ?`,
      [_id]
    );
    if (!rows.length) return res.status(404).json({ error: "Order not found" });
    const order: any = {
      _id: rows[0].order_id,
      user_id: rows[0].user_id,
      total_amount: rows[0].total_amount,
      status: rows[0].status,
      shipping_address: rows[0].shipping_address,
      shipping_city: rows[0].shipping_city,
      shipping_postal_code: rows[0].shipping_postal_code,
      shipping_country: rows[0].shipping_country,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      items: [],
    };
    rows.forEach((row) => {
      if (row.item_id) {
        order.items.push({
          id: row.item_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.price,
          size: row.size,
          color: row.color,
          product_name: row.product_name,
          product_image: row.product_image,
        });
      }
    });
    res.json({ data: order, success: true });
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
    let shipping_address = "",
      shipping_city = "",
      shipping_postal_code = "",
      shipping_country = "";
    if (req.body.address) {
      const a = req.body.address;
      shipping_address = `${a.house || ""} ${a.street || ""} ${
        a.village || ""
      } ${a.commune || ""} ${a.district || ""} ${a.province || ""}`.trim();
      shipping_city = a.province || "";
      shipping_postal_code = a.postal_code || "";
      shipping_country = a.country || "Cambodia";
    } else {
      shipping_address = req.body.shipping_address;
      shipping_city = req.body.shipping_city;
      shipping_postal_code = req.body.shipping_postal_code;
      shipping_country = req.body.shipping_country;
    }
    const [cart_items] = await pool.query<RowDataPacket[]>(
      `SELECT ci.product_id, ci.quantity, ci.size, ci.color, p.price, p.stock, p.name AS product_name, p.image AS product_image
         FROM cart_items ci
         JOIN products p ON ci.product_id = p._id
         WHERE ci.user_id = ?`,
      [req.user_id]
    );
    if (cart_items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }
    let subtotal = 0;
    const outOfStock: any[] = [];
    const items = cart_items.map((item) => {
      if (item.stock < item.quantity) {
        outOfStock.push({
          product_id: item.product_id,
          product_name: item.product_name,
        });
      }
      subtotal += item.price * item.quantity;
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
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
      data: {
        items,
        subtotal,
        shipping,
        tax,
        total,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_country,
      },
      success: true,
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
      shipping_address,
      shipping_city,
      shipping_postal_code,
      shipping_country,
    } = req.body;

    // Get cart items for user
    const [cart_items] = await pool.query<RowDataPacket[]>(
      `SELECT ci.product_id, ci.quantity, ci.size, ci.color, p.price, p.name, p.image
       FROM cart_items ci
       JOIN products p ON ci.product_id = p._id
       WHERE ci.user_id = ?`,
      [req.user_id]
    );
    if (cart_items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total
    let total_amount = 0;
    for (const item of cart_items) {
      total_amount += item.price * item.quantity;
    }

    // Return summary
    res.json({
      data: {
        items: cart_items,
        total: total_amount,
        shipping: {
          address: shipping_address,
          city: shipping_city,
          postal_code: shipping_postal_code,
          country: shipping_country,
        },
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to prepare order summary" });
  }
};
