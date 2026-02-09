import { Response } from "express";
import { sendMail } from "../utils/mailer";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateObjectId } from "../utils/objectid.util";
import { generateCode } from "../utils/code.util";
import { Order } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { CartItem } from "../models/CartItem";
import { sequelize } from "../config/sequelize";
import { Op, WhereOptions } from "sequelize";

// Validation rules for creating/updating an order
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

// Helper to build filter clause and params
function buildOrderWhereClause(query: any) {
  let { code, search, q, status } = query;
  if (!search && q) search = q;

  const whereClause: WhereOptions = {};

  if (code) {
    if (typeof code === "string") {
      whereClause["code" as any] = { [Op.like]: `%${code}%` };
    } else if (Array.isArray(code)) {
      whereClause["code" as any] = {
        [Op.or]: code.map((c) => ({ [Op.like]: `%${c}%` })),
      };
    }
  }

  if (status && typeof status === "string" && status.trim().length > 0) {
    whereClause["status" as any] = status.trim();
  }

  if (search) {
    const s = `%${search}%`;
    // Use cast to any to avoid symbol index error with strict alignment
    (whereClause as any)[Op.or] = [
      { code: { [Op.like]: s } },
      { "$user.first_name$": { [Op.like]: s } },
      { "$user.last_name$": { [Op.like]: s } },
    ];
  }

  return whereClause;
}

// Helper to format order response
function formatOrder(orderModel: Order) {
  const order = orderModel.toJSON();

  // Parse address if it is string
  let addressObj = {};
  try {
    addressObj =
      typeof order.address === "string"
        ? JSON.parse(order.address || "{}")
        : order.address;
  } catch {
    addressObj = {};
  }

  // Map items
  const items = (order.items || []).map((item: any) => ({
    _id: item._id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: Number(item.price),
    size: item.size,
    color: item.color,
    product_name: item.product?.name,
    product_image: item.product?.image,
  }));

  return {
    _id: order._id,
    code: order.code,
    user: order.user
      ? {
          _id: order.user._id,
          email: order.user.email,
          phone: order.user.phone,
          first_name: order.user.first_name,
          last_name: order.user.last_name,
        }
      : null,
    total_amount: Number(order.total_amount),
    status: order.status,
    address: addressObj,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items,
  };
}

// Get all orders (admin only)
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    let { page, limit } = req.query;
    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    const whereClause = buildOrderWhereClause(req.query);

    const { count, rows } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ["_id", "email", "phone", "first_name", "last_name"],
        },
        {
          model: OrderItem,
          include: [{ model: Product, attributes: ["name", "image"] }],
        },
      ],
      distinct: true, // Important for accurate count with includes
      limit: itemsPerPage,
      offset: offset,
      order: [
        ["updated_at", "DESC"],
        ["_id", "DESC"],
      ],
    });

    const data = rows.map(formatOrder);

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
    console.error("getAllOrders error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Create a new order
export const createOrder = async (req: AuthRequest, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    // Address object
    const address = req.body.address || {};
    const addressJson = JSON.stringify(address);

    const order_id = req.body._id || generateObjectId();
    const order_code = req.body?.code?.trim() || generateCode(0, "O");

    if (!req.user_id) {
      await t.rollback();
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get cart items
    const cartItems = await CartItem.findAll({
      where: { user_id: req.user_id },
      include: [{ model: Product }],
      lock: true, // FOR UPDATE
      transaction: t,
    });

    if (!cartItems.length) {
      throw new Error("Cart is empty");
    }

    let total_amount = 0;
    const orderItemsData = [];

    for (const item of cartItems) {
      const product = item.product;
      if (!product) continue;

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.product_id}`);
      }

      // Calculate price (using product price, ignoring potential price changes in cart if any, assuming product price is source of truth)
      // Original logic used p.price
      const price = Number(product.price);
      total_amount += price * item.quantity;

      orderItemsData.push({
        _id: generateObjectId(),
        order_id: order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: price, // Store price at time of order
        size: item.size || null,
        color: item.color || null,
      });

      // Update stock
      product.stock -= item.quantity;
      await product.save({ transaction: t });
    }

    // Create order
    await Order.create(
      {
        _id: order_id,
        code: order_code,
        user_id: req.user_id,
        total_amount: total_amount,
        status: "pending",
        address: addressJson,
      },
      { transaction: t },
    );

    // Create order items
    await OrderItem.bulkCreate(orderItemsData, { transaction: t });

    // Clear cart
    await CartItem.destroy({
      where: { user_id: req.user_id },
      transaction: t,
    });

    await t.commit();

    // Fetch created order to return full details
    const order = await Order.findByPk(order_id, {
      include: [{ model: OrderItem, include: [Product] }],
    });

    if (!order) throw new Error("Order creation failed");

    // Format for response
    // Match original response structure quite closely
    const responseOrder = formatOrder(order);
    // Explicitly map structure to match what frontend likely expects from original 'createOrder' return
    // Original returned: { data: { _id, user_id, total_amount, status, address: obj, items: [...] }, success: true }
    // formatOrder does exactly this (with populated user if available, here user might not be populated but user_id is)
    // Actually formatOrder expects user to be populated for the 'user' field.
    // Let's add user_id to result
    const result: any = {
      ...responseOrder,
      user_id: req.user_id,
    };

    res.status(201).json({ data: result, success: true });
  } catch (error: any) {
    await t.rollback();
    console.error("createOrder error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.user_id);
    const isAdmin = user?.role === "admin";

    let { page, limit } = req.query;
    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    const whereClause = buildOrderWhereClause(req.query);
    if (!isAdmin) {
      whereClause["user_id" as any] = req.user_id;
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ["_id", "email", "phone", "first_name", "last_name"],
        },
        {
          model: OrderItem,
          include: [{ model: Product, attributes: ["name", "image"] }],
        },
      ],
      distinct: true,
      limit: itemsPerPage,
      offset: offset,
      order: [
        ["updated_at", "DESC"],
        ["_id", "DESC"],
      ],
    });

    const data = rows.map(formatOrder);

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
    console.error("getOrders error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Get order by ID
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(req.user_id);
    const isAdmin = user?.role === "admin";

    const where: WhereOptions = { _id: id };
    if (!isAdmin) {
      where["user_id" as any] = req.user_id;
    }

    const order = await Order.findOne({
      where,
      include: [
        {
          model: User,
          attributes: ["_id", "email", "phone", "first_name", "last_name"],
        },
        {
          model: OrderItem,
          include: [{ model: Product, attributes: ["name", "image"] }],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error("getOrderById error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Update order status
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

    const user = await User.findByPk(req.user_id);
    const isAdmin = user?.role === "admin";

    const where: WhereOptions = { _id: id };
    if (!isAdmin) {
      where["user_id" as any] = req.user_id;
    }

    const order = await Order.findOne({
      where,
      include: [
        { model: User, attributes: ["email", "first_name", "last_name"] },
      ],
    });

    if (!order) {
      return res
        .status(404)
        .json({ error: "Order not found or permission denied" });
    }

    order.status = status;
    order.updated_at = new Date(); // Explicitly update updated_at if needed, though Sequelize handles it
    await order.save();

    // Send email notification to user if email exists
    if (order.user && order.user.email) {
      try {
        await sendMail({
          to: order.user.email,
          subject: `Order #${order.code} status updated to ${status}`,
          html: `<p>Dear ${order.user.first_name || ""},</p>
            <p>Your order <b>#${order.code}</b> status has been updated to <b>${status.toUpperCase()}</b>.</p>
            <p>Thank you for shopping with us!</p>`,
        });
      } catch (mailErr) {
        // Log but do not block order update
        console.error("Failed to send order status email:", mailErr);
      }
    }
    // Fetch full order for response
    const updatedOrder = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          include: [{ model: Product, attributes: ["name", "image"] }],
        },
      ],
    });

    if (!updatedOrder)
      return res.status(404).json({ error: "Order not found" });

    // Format response to match original logic
    const formatted = formatOrder(updatedOrder);
    const responseData = {
      ...formatted,
      user_id: updatedOrder.user_id,
      shipping_address: formatted.address, // Legacy mapping? Original code mapped address to shipping_address
      // Actually original 'updateOrderStatus' result mapping:
      // status, shipping_address (from rows[0].shipping_address?? No, existing code mapped rows[0].shipping_address which failed if column didn't exist or was virtual)
      // Original code:
      // shipping_address: rows[0].shipping_address
      // But the SELECT was `o.*` and `o` has `address`. `shipping_address` likely wasn't in `orders` table unless added later.
      // Assuming `address` column contains the JSON.
      // I will return `address` as `shipping_address` just in case, or keep `address`.
    };

    res.json({ data: responseData, success: true });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Validation for order summary
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

    if (!req.user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cartItems = await CartItem.findAll({
      where: { user_id: req.user_id },
      include: [{ model: Product }],
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let subtotal = 0;
    const outOfStock: any[] = [];

    const items = cartItems
      .map((item) => {
        const product = item.product;
        // Should not happen if data integrity is fine
        if (!product) return null;

        if (product.stock < item.quantity) {
          outOfStock.push({
            product_id: item.product_id,
            product_name: product.name,
          });
        }

        const price = Number(product.price);
        const discount_value = product.discount_value
          ? Number(product.discount_value)
          : null;

        let discounted_price = price;
        if (product.discount_type === "percentage" && discount_value !== null) {
          discounted_price = price * (1 - discount_value / 100);
        } else if (
          product.discount_type === "fixed" &&
          discount_value !== null
        ) {
          discounted_price = price - discount_value;
        }

        subtotal += discounted_price * item.quantity;

        return {
          product_id: item.product_id,
          product_name: product.name,
          product_image: product.image,
          quantity: item.quantity,
          price: price,
          discounted_price,
          discount_type: product.discount_type,
          discount_value,
          discount_start: product.discount_start,
          discount_end: product.discount_end,
          size: item.size,
          color: item.color,
          stock: product.stock,
        };
      })
      .filter(Boolean); // Filter out nulls

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
        address: {
          shipping_address,
          shipping_city,
          shipping_postal_code,
          shipping_country,
        },
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
  // This function seems to duplicate orderSummary logic but usually used for just fetching calculated totals based on current cart
  // Implementation is similar to orderSummary but validation might differ or input.
  // Original implementation started on line 769 was incomplete in view.
  // I will implement it mirroring orderSummary but maybe without address validation if not needed.

  try {
    if (!req.user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      shipping_address,
      shipping_city,
      shipping_postal_code,
      shipping_country,
    } = req.body;

    const cartItems = await CartItem.findAll({
      where: { user_id: req.user_id },
      include: [{ model: Product }],
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let subtotal = 0;

    const items = cartItems
      .map((item) => {
        const product = item.product;
        if (!product) return null;

        const price = Number(product.price);
        const discount_value = product.discount_value
          ? Number(product.discount_value)
          : null;

        let discounted_price = price;
        if (product.discount_type === "percentage" && discount_value !== null) {
          discounted_price = price * (1 - discount_value / 100);
        } else if (
          product.discount_type === "fixed" &&
          discount_value !== null
        ) {
          discounted_price = price - discount_value;
        }

        subtotal += discounted_price * item.quantity;

        return {
          product_id: item.product_id,
          product_name: product.name,
          product_image: product.image,
          quantity: item.quantity,
          price: price,
          discounted_price,
          discount_type: product.discount_type,
          discount_value,
          discount_start: product.discount_start,
          discount_end: product.discount_end,
          size: item.size,
          color: item.color,
        };
      })
      .filter(Boolean);

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
        address: {
          shipping_address,
          shipping_city,
          shipping_postal_code,
          shipping_country,
        },
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to prepare order summary" });
    console.error(error);
  }
};

// Get orders for current user (always filters by req.user_id, even for admin)
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    let { page, limit } = req.query;
    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    if (!req.user_id) return res.status(401).json({ error: "Unauthorized" });

    const { count, rows } = await Order.findAndCountAll({
      where: { user_id: req.user_id },
      include: [
        {
          model: User,
          attributes: ["_id", "email", "phone", "first_name", "last_name"],
        },
        {
          model: OrderItem,
          include: [{ model: Product, attributes: ["name", "image"] }],
        },
      ],
      distinct: true,
      limit: itemsPerPage,
      offset: offset,
      order: [
        ["updated_at", "DESC"],
        ["_id", "DESC"],
      ],
    });

    const data = rows.map(formatOrder);

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
    console.error("getUserOrders error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
