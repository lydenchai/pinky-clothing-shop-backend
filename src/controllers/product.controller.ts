import { Request, Response } from "express";
import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateCode } from "../utils/code.util";
import { generateObjectId } from "../utils/objectid.util";

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

// Helper to build filters for getAllProducts
function buildProductFilters(queryObj: any) {
  let { code, category, subcategory, minPrice, maxPrice, search, inStock, q } =
    queryObj;
  if (!search && q) search = q;

  let query = "SELECT * FROM products WHERE 1=1";
  const params: any[] = [];

  if (
    code &&
    (typeof code === "string" || typeof code === "number") &&
    code !== ""
  ) {
    query += " AND code LIKE ?";
    params.push(`%${code}%`);
  }
  if (category) {
    query += " AND LOWER(category) = LOWER(?)";
    params.push(category);
  }
  if (subcategory) {
    query += " AND LOWER(subcategory) = LOWER(?)";
    params.push(subcategory);
  }
  if (minPrice) {
    query += " AND price >= ?";
    params.push(Number.parseFloat(minPrice as string));
  }
  if (maxPrice) {
    query += " AND price <= ?";
    params.push(Number.parseFloat(maxPrice as string));
  }
  if (search) {
    let searchStr = "";
    if (typeof search === "string" || typeof search === "number") {
      searchStr = String(search);
    }
    const searchTerm = `%${searchStr}%`;
    query += " AND (code LIKE ? OR name LIKE ?)";
    params.push(searchTerm, searchTerm);
  }
  if (inStock === "true") {
    query += " AND stock > 0";
  }
  return { query, params };
}

// Helper to parse array fields robustly
function parseArrayField(field: any) {
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error(e);
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

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    const { query, params } = buildProductFilters(req.query);

    // Get total count for pagination
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Add pagination to query
    const paginatedQuery = query + " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const paginatedParams = [...params, itemsPerPage, offset];

    const [products] = await pool.query<RowDataPacket[]>(
      paginatedQuery,
      paginatedParams,
    );

    const productsWithParsedFields = products.map((p) => ({
      ...p,
      price:
        p.price !== undefined && p.price !== null
          ? Number.parseFloat(p.price)
          : p.price,
      sizes: parseArrayField(p.sizes),
      colors: parseArrayField(p.colors),
    }));
    res.json({
      success: true,
      data: productsWithParsedFields,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE _id = ?",
      [id],
    );
    if (products.length === 0) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    // Ensure price is float and sizes/colors are arrays in response, robust to legacy/corrupt data
    // Use shared helper to avoid duplicate logic
    // Use the shared parseArrayField helper
    const product = products[0];
    if (product) {
      if (product.price !== undefined && product.price !== null) {
        product.price = Number.parseFloat(product.price);
      }
      product.sizes = parseArrayField(product.sizes);
      product.colors = parseArrayField(product.colors);
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

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
    const productCode =
      code && code.trim() ? code.trim() : generateCode(0, "P");
    // Ensure sizes and colors are never undefined
    const safeSizes = sizes === undefined ? null : sizes;
    const safeColors = colors === undefined ? null : colors;
    try {
      const values = [
        _id,
        productCode,
        name,
        description,
        price,
        category,
        subcategory || null,
        image,
        stock || 0,
        safeSizes,
        safeColors,
      ];
      console.log("Product INSERT values:", values);
      await pool.query<ResultSetHeader>(
        `INSERT INTO products (_id, code, name, description, price, category, subcategory, image, stock, sizes, colors)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values,
      );
    } catch (dbError) {
      console.error("DB Insert Error:", dbError);
      return res
        .status(500)
        .json({ error: "Database Error", details: dbError });
    }
    try {
      const [products] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM products WHERE _id = ?",
        [_id],
      );
      // Ensure price is float and sizes/colors are arrays in response, robust to legacy/corrupt data
      const product = products[0];
      if (product) {
        if (product.price !== undefined && product.price !== null) {
          product.price = Number.parseFloat(product.price);
        }
        product.sizes = parseArrayField(product.sizes);
        product.colors = parseArrayField(product.colors);
      }
      res.status(201).json({ data: product, success: true });
    } catch (dbError) {
      console.error("DB Select Error:", dbError);
      return res
        .status(500)
        .json({ error: "Database Error", details: dbError });
    }
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let {
      name,
      description,
      price,
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
    // Convert arrays to comma-separated strings if needed
    if (Array.isArray(sizes)) {
      sizes = sizes.join(",");
    }
    if (Array.isArray(colors)) {
      colors = colors.join(",");
    }
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE products SET name = ?, description = ?, price = ?, category = ?, subcategory = ?, image = ?, stock = ?, sizes = ?, colors = ?
       WHERE _id = ?`,
      [
        name,
        description,
        price,
        category,
        subcategory || null,
        image,
        stock,
        sizes || null,
        colors || null,
        id,
      ],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE _id = ?",
      [id],
    );
    // Ensure price is float and sizes/colors are arrays in response, robust to legacy/corrupt data
    const product = products[0];
    if (product) {
      if (product.price !== undefined && product.price !== null) {
        product.price = Number.parseFloat(product.price);
      }
      product.sizes = parseArrayField(product.sizes);
      product.colors = parseArrayField(product.colors);
    }
    res.json({ data: product, success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM products WHERE _id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    res.json({ data: null, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const [categories] = await pool.query<RowDataPacket[]>(
      "SELECT DISTINCT category FROM products ORDER BY category",
    );

    res.json({ data: categories.map((c) => c.category), success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

export const getSubcategories = async (req: Request, res: Response) => {
  try {
    const [subcategories] = await pool.query<RowDataPacket[]>(
      "SELECT DISTINCT subcategory FROM products ORDER BY subcategory",
    );
    
    res.json({ data: subcategories.map((c) => c.subcategory), success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};
