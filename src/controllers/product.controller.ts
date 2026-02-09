import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateCode } from "../utils/code.util";
import { generateObjectId } from "../utils/objectid.util";
import { Product } from "../models/Product";
import { Op, WhereOptions } from "sequelize";

// Validation rules for creating/updating a product
export const productValidation = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category").notEmpty().withMessage("Category is required"),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("subcategory").optional().isString(),
];

// Helper to calculate discounted price
function getDiscountedPrice(product: any) {
  const now = new Date();
  if (
    product.discount_type &&
    product.discount_value &&
    (!product.discount_start || new Date(product.discount_start) <= now) &&
    (!product.discount_end || new Date(product.discount_end) >= now)
  ) {
    if (product.discount_type === "percentage") {
      return Math.max(0, Number(product.price) * (1 - Number(product.discount_value) / 100));
    } else if (product.discount_type === "fixed") {
      return Math.max(0, Number(product.price) - Number(product.discount_value));
    }
  }
  return Number(product.price);
}

// Helper to parse array fields robustly
function parseArrayField(field: any) {
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      if (field.includes(",")) {
        return field
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  }
  return [];
}

// Get all products with pagination and filters
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    let { code, category, subcategory, minPrice, maxPrice, search, inStock, q } = req.query;
    if (!search && q) search = q;

    const whereClause: WhereOptions = {};

    if (code && typeof code === "string" && code.trim() !== "") {
      whereClause["code" as any] = { [Op.like]: `%${code}%` };
    }

    if (category) {
      whereClause["category" as any] = category;
    }

    if (subcategory) {
      whereClause["subcategory" as any] = subcategory;
    }

    if (minPrice) {
      whereClause["price" as any] = { ...whereClause["price" as any], [Op.gte]: Number.parseFloat(minPrice as string) };
    }

    if (maxPrice) {
      whereClause["price" as any] = { ...whereClause["price" as any], [Op.lte]: Number.parseFloat(maxPrice as string) };
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const searchStr = search.trim();
      (whereClause as any)[Op.or] = [
        { code: { [Op.like]: `%${searchStr}%` } },
        { name: { [Op.like]: `%${searchStr}%` } }
      ];
    }

    if (inStock === "true") {
      whereClause["stock" as any] = { [Op.gt]: 0 };
    }

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      limit: itemsPerPage,
      offset: offset,
      order: [["created_at", "DESC"]],
    });

    const productsWithParsedFields = rows.map((p) => {
      const productData = p.toJSON(); // Convert Sequelize instance to plain object
      const price = Number(productData.price);

      let discounted_price = getDiscountedPrice({ ...productData, price });
      discounted_price = Math.round(discounted_price * 100) / 100;

      return {
        ...productData,
        price,
        discounted_price,
        sizes: parseArrayField(productData.sizes),
        colors: parseArrayField(productData.colors),
      };
    });

    res.json({
      success: true,
      data: productsWithParsedFields,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems: count,
        totalPages: Math.ceil(count / itemsPerPage),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productInstance = await Product.findByPk(id);
    if (!productInstance) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    const product = productInstance.toJSON();
    if (product.price !== undefined && product.price !== null) {
      product.price = Number.parseFloat(product.price);
    }
    let discounted_price = getDiscountedPrice(product);
    if (discounted_price !== undefined && discounted_price !== null) {
      product.discounted_price = Math.round(discounted_price * 100) / 100;
    }
    product.sizes = parseArrayField(product.sizes);
    product.colors = parseArrayField(product.colors);

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Create a new product
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      price,
      category,
      subcategory,
      image,
      stock,
      sizes,
      colors,
      code,
    } = req.body;
    // Check for required fields
    if (
      !name ||
      !description ||
      price === undefined ||
      !category ||
      image === undefined
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        details: { name, description, price, category, image },
      });
    }

    const _id = req.body._id || generateObjectId();
    const productCode = code?.trim() || generateCode(0, "P");

    // Ensure sizes and colors are never undefined
    // For Sequelize, if we pass arrays, we might need to stringify them if the column is string
    // The current logic expects them to be stored.
    // If they come as arrays, we should probably JSON.stringify them if using TEXT/VARCHAR.
    let safeSizes = sizes;
    if (Array.isArray(sizes)) {
      safeSizes = JSON.stringify(sizes);
    }

    let safeColors = colors;
    if (Array.isArray(colors)) {
      safeColors = JSON.stringify(colors);
    }

    const newProduct = await Product.create({
      _id,
      code: productCode,
      name,
      description,
      price,
      category,
      subcategory: subcategory || null,
      image,
      stock: stock || 0,
      sizes: safeSizes,
      colors: safeColors
    });

    // Prepare response
    const product = newProduct.toJSON();
    product.price = Number.parseFloat(product.price);
    let discounted_price = getDiscountedPrice(product);
    product.discounted_price = Math.round(discounted_price * 100) / 100;
    product.sizes = parseArrayField(product.sizes);
    product.colors = parseArrayField(product.colors);

    res.status(201).json({ data: product, success: true });
  } catch (error: any) {
    console.error("Create Product Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

// Update an existing product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let {
      name,
      description,
      price,
      discount_type,
      discount_value,
      discount_start,
      discount_end,
      category,
      subcategory,
      image,
      stock,
      sizes,
      colors,
    } = req.body;

    // If a file was uploaded, use its path for image
    if (req.file) {
      image = req.file.path;
    }

    // Arrays to string
    if (Array.isArray(sizes)) {
      sizes = JSON.stringify(sizes); // Changed from join(',') to JSON.stringify to be consistent with new create logic, or keep join(',') if that's what front end expects in legacy
      // If the helper `parseArrayField` tries JSON.parse first, JSON.stringify is safer.
      // But let's check parseArrayField: it tries JSON.parse, then falls back to split(,).
      // So JSON.stringify is better.
    }
    if (Array.isArray(colors)) {
      colors = JSON.stringify(colors);
    }

    const updates: any = {
      name,
      description,
      price,
      discount_type: discount_type || null,
      discount_value: discount_value || null,
      discount_start: discount_start || null,
      discount_end: discount_end || null,
      category,
      subcategory: subcategory || null,
      image,
      stock,
      sizes: sizes || null,
      colors: colors || null,
    };

    // Remove undefined keys
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    const [affectedRows] = await Product.update(updates, {
      where: { _id: id }
    });

    if (affectedRows === 0) {
      // Check if exists
      const exists = await Product.findByPk(id);
      if (!exists) {
        return res.status(404).json({ data: null, message: "Product not found" });
      }
    }

    const updatedProductInstance = await Product.findByPk(id);
    if (!updatedProductInstance) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }

    const product = updatedProductInstance.toJSON();
    product.price = Number.parseFloat(product.price);
    let discounted_price = getDiscountedPrice(product);
    product.discounted_price = Math.round(discounted_price * 100) / 100;
    product.sizes = parseArrayField(product.sizes);
    product.colors = parseArrayField(product.colors);

    res.json({ data: product, success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Delete a product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const affectedRows = await Product.destroy({
      where: { _id: id }
    });

    if (affectedRows === 0) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    res.json({ data: null, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Get distinct categories and subcategories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Product.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
      ],
      order: [['category', 'ASC']]
    });

    res.json({ data: categories.map((c: any) => c.category), success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Get distinct subcategories
export const getSubcategories = async (req: Request, res: Response) => {
  try {
    const subcategories = await Product.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('subcategory')), 'subcategory']
      ],
      order: [['subcategory', 'ASC']]
    });

    res.json({ data: subcategories.map((c: any) => c.subcategory), success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

import { sequelize } from "../config/sequelize"; // added for getCategories

// Bulk set discount for multiple products
export const bulkSetDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const {
      productIds,
      discountType,
      discountValue,
      discountStart,
      discountEnd,
    } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "No products selected" });
    }

    const [affectedRows] = await Product.update({
      discount_type: discountType,
      discount_value: discountValue,
      discount_start: discountStart, // Sequelize handles Date objects
      discount_end: discountEnd
    }, {
      where: {
        _id: {
          [Op.in]: productIds
        }
      }
    });

    res.json({ success: true, affected: affectedRows });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};
