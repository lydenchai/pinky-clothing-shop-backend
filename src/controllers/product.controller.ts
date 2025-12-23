import { Request, Response } from "express";
import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateObjectId } from "./auth.controller";

export const productValidation = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category").notEmpty().withMessage("Category is required"),
  // body("image").notEmpty().withMessage("Image URL is required"),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
];

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    let { category, minPrice, maxPrice, search, inStock, page, limit, q } =
      req.query;
    if (!search && q) search = q;

    // Pagination parameters
    const currentPage = parseInt(page as string) || 1;
    const itemsPerPage = parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    let query = "SELECT * FROM products WHERE 1=1";
    const params: any[] = [];

    if (category) {
      query += " AND LOWER(category) = LOWER(?)";
      params.push(category);
    }

    if (minPrice) {
      query += " AND price >= ?";
      params.push(parseFloat(minPrice as string));
    }

    if (maxPrice) {
      query += " AND price <= ?";
      params.push(parseFloat(maxPrice as string));
    }

    if (search) {
      query += " AND (name LIKE ? OR description LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (inStock === "true") {
      query += " AND stock > 0";
    }

    // Get total count for pagination
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Add pagination to query
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(itemsPerPage, offset);

    const [products] = await pool.query<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE _id = ?",
      [id]
    );
    if (products.length === 0) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    res.json({ data: products[0], success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, category, image, stock, sizes, colors } =
      req.body;
    // Generate a UUID for _id
    // Use ESM import for uuid
    // import { v4 as uuidv4 } from 'uuid'; (top of file)
    const _id = req.body._id || generateObjectId();
    try {
      await pool.query<ResultSetHeader>(
        `INSERT INTO products (_id, name, description, price, category, image, stock, sizes, colors)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          _id,
          name,
          description,
          price,
          category,
          image,
          stock || 0,
          sizes || null,
          colors || null,
        ]
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
        [_id]
      );
      res.status(201).json({ data: products[0], success: true });
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
    let { name, description, price, category, image, stock, sizes, colors } =
      req.body;
    // Convert arrays to comma-separated strings if needed
    if (Array.isArray(sizes)) {
      sizes = sizes.join(",");
    }
    if (Array.isArray(colors)) {
      colors = colors.join(",");
    }
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, stock = ?, sizes = ?, colors = ?
       WHERE _id = ?`,
      [
        name,
        description,
        price,
        category,
        image,
        stock,
        sizes || null,
        colors || null,
        id,
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE _id = ?",
      [id]
    );
    res.json({ data: products[0], success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM products WHERE _id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    res.json({ data: null, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const [categories] = await pool.query<RowDataPacket[]>(
      "SELECT DISTINCT category FROM products ORDER BY category"
    );

    res.json({ data: categories.map((c) => c.category), success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
