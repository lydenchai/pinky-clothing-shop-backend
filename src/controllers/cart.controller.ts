import { Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateObjectId } from "../utils/objectid.util";
import { generateCode } from "../utils/code.util";
import { CartItem } from "../models/CartItem";
import { Product } from "../models/Product";

// Helper to validate and get product
async function validateAndGetProduct(
  product_id: string,
  quantity: number,
  res: Response,
) {
  const product = await Product.findByPk(product_id, {
    attributes: ["_id", "stock"]
  });

  if (!product) {
    res.status(404).json({
      error: "Product not found",
      code: "PRODUCT_NOT_FOUND",
    });
    return null;
  }

  if (product.stock < quantity) {
    res.status(400).json({
      error: `Only ${product.stock} item(s) left in stock. Please adjust your quantity.`,
      code: "INSUFFICIENT_STOCK",
    });
    return null;
  }
  return product;
}

// Helper to update or insert cart item
async function updateOrInsertCartItem({
  req,
  body,
  product,
  res,
}: {
  req: AuthRequest;
  body: any;
  product: any;
  res: Response;
}) {
  const { product_id, quantity, size, color } = body;

  const existingItem = await CartItem.findOne({
    where: {
      user_id: req.user_id,
      product_id: product_id,
      size: size || null,
      color: color || null
    }
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (product.stock < newQuantity) {
      res.status(400).json({
        error: `Only ${product.stock} item(s) left in stock. Please adjust your quantity.`,
        code: "INSUFFICIENT_STOCK",
      });
      return false;
    }
    existingItem.quantity = newQuantity;
    await existingItem.save();
  } else {
    const newId = generateObjectId();
    const cartCode = body.code?.trim()
      ? body.code.trim()
      : generateCode(0, "S");

    await CartItem.create({
      _id: newId,
      code: cartCode,
      user_id: req.user_id,
      product_id: product_id,
      quantity: quantity,
      size: size || null,
      color: color || null
    });
  }
  return true;
}

// Helper to get cart summary
async function getCartSummary(user_id: string) {
  const cartItems = await CartItem.findAll({
    where: { user_id },
    include: [{
      model: Product,
      attributes: ['name', 'price', 'image', 'stock', 'discount_type', 'discount_value', 'discount_start', 'discount_end']
    }],
    order: [['created_at', 'DESC']]
  });

  const formattedItems = cartItems.map(item => {
    const itemJson = item.toJSON();
    const product = itemJson.product;
    // Ensure numeric values
    const productPrice = product ? Number(product.price) : 0;

    return {
      ...itemJson,
      product_name: product?.name,
      product_price: productPrice,
      product_image: product?.image,
      product_stock: product?.stock,
      product: undefined // Remove nested product object to match original raw query structure partially if needed, but logic below relies on item.product_price
    };
  });


  const subtotal = formattedItems.reduce(
    (sum, item) => sum + (item.product_price ?? 0) * item.quantity,
    0,
  );
  let shipping = 0;
  if (subtotal > 0) {
    shipping = subtotal > 100 ? 0 : 10;
  }
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return {
    items: formattedItems,
    totalItems: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    shipping,
    tax,
    total,
  };
}

// Validation rules for adding/updating cart items
export const cartItemValidation = [
  // Accept both flat and nested 'data.product_id' and 'quantity'
  body().custom((value, { req }) => {
    const body = req.body.data ? req.body.data : req.body;
    const product_id = body.product_id;
    // Accept both 24-char Mongo IDs and 36-char UUIDs
    const isMongoId =
      typeof product_id === "string" && /^[a-fA-F0-9]{24}$/.test(product_id);
    const isUUID = typeof product_id === "string" && product_id.length === 36;
    if (!isMongoId && !isUUID) {
      throw new Error(
        "Valid product ID is required (24-char MongoID or 36-char UUID)",
      );
    }
    return true;
  }),
  body().custom((value, { req }) => {
    const body = req.body.data ? req.body.data : req.body;
    const quantity = body.quantity;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }
    return true;
  }),
];

// Get current user's cart
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const cartItems = await CartItem.findAll({
      where: { user_id: req.user_id },
      include: [{
        model: Product,
      }],
      order: [['created_at', 'DESC']]
    });

    const items = cartItems.map((itemInstance) => {
      const item = itemInstance.toJSON();
      const product = item.product;

      if (!product) return item; // Should not happen due to integrity constraint usually

      // Ensure price and discount_value are floats
      const price = Number.parseFloat(product.price);
      const discount_value =
        product.discount_value !== null &&
          product.discount_value !== undefined
          ? Number.parseFloat(product.discount_value)
          : null;

      // Calculate discounted_price
      let discounted_price = price;
      if (
        product.discount_type === "percentage" &&
        discount_value !== null
      ) {
        discounted_price = price * (1 - discount_value / 100);
      } else if (
        product.discount_type === "fixed" &&
        discount_value !== null
      ) {
        discounted_price = price - discount_value;
      }

      return {
        _id: item._id,
        user_id: item.user_id,
        quantity: item.quantity,
        created_at: item.created_at,
        product: {
          _id: product._id,
          name: product.name,
          sizes: item.size, // Cart item size selection
          colors: item.color, // Cart item color selection
          price,
          discount_type: product.discount_type,
          discount_value,
          discount_start: product.discount_start,
          discount_end: product.discount_end,
          discounted_price,
          image: product.image,
          stock: product.stock,
        },
      };
    });

    // Calculate cart summary
    const subtotal = items.reduce(
      (sum: number, item: any) =>
        sum +
        (item.product.discounted_price ?? item.product.price) * item.quantity,
      0,
    );
    let shipping = 0;
    if (subtotal > 0) {
      shipping = subtotal > 100 ? 0 : 10;
    }
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    res.json({
      data: {
        items,
        totalItems: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        subtotal,
        shipping,
        tax,
        total,
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Get a specific cart item by ID
export const getCartItemById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await CartItem.findByPk(id, {
      include: [Product]
    });

    if (!item) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const data = item.toJSON();
    // Flat structure for response as expected by original controller?
    // Original query returned joined fields.
    // The original response was:
    // { data: { _id, user_id, ..., product_name, product_price, ... } }

    const product = data.product;
    const responseData = {
      _id: data._id,
      user_id: data.user_id,
      product_id: data.product_id,
      quantity: data.quantity,
      size: data.size,
      color: data.color,
      created_at: data.created_at,
      product_name: product?.name,
      product_price: product ? Number(product.price) : null,
      product_image: product?.image,
      product_stock: product?.stock
    };

    res.json({ data: responseData, success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Add item to cart
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body.data ? req.body.data : req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0]?.msg || "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { product_id, quantity } = body;

    if (!req.user_id) {
      return res.status(401).json({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const product = await validateAndGetProduct(product_id, quantity, res);
    if (!product) return;

    const updated = await updateOrInsertCartItem({ req, body, product, res });
    if (!updated) return;

    const cartSummary = await getCartSummary(req.user_id);
    res.status(201).json({
      data: cartSummary,
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

// Update cart item quantity
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
    if (!req.user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cartItem = await CartItem.findOne({
      where: { _id: id, user_id: req.user_id },
      include: [Product]
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const product = cartItem.product;
    if (product.stock < quantity) {
      return res.status(400).json({
        error: `Only ${product.stock} item(s) left in stock. Please adjust your quantity.`,
      });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    // After update, return the full cart as an object (as getCartSummary does, but maybe in different format?)
    // Original used custom query returning flattened list.
    // Let's reuse getCart logic or getCartSummary logic but match response format.
    // Original updateCartItem returns: { data: { items: [...], totalItems, ... } }

    // We can reuse getCartSummary logic basically.
    // The original getCartSummary implementation in this file (the helper) returned an object structure.
    // My new getCartSummary returns the same structure.

    // Wait, existing logic in updateCartItem duplicated the query from getCart.
    // I will call getCartSummary helper essentially.

    const cartSummary = await getCartSummary(req.user_id);
    res.json({
      data: cartSummary,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Remove item from cart
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({ error: "Invalid cart item ID" });
    }

    const cartItem = await CartItem.findByPk(id);

    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (!req.user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (cartItem.user_id !== req.user_id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await cartItem.destroy();

    // After remove, return the full cart as an object
    const cartSummary = await getCartSummary(req.user_id);
    res.json({
      data: cartSummary,
      success: true
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Clear entire cart
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    await CartItem.destroy({
      where: { user_id: req.user_id }
    });

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
    console.error(error);
  }
};
