import { Request, Response } from "express";
import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";

export const productValidation = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category").notEmpty().withMessage("Category is required"),
  body("image").notEmpty().withMessage("Image URL is required"),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
];

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { category, minPrice, maxPrice, search, inStock, page, limit } =
      req.query;

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
    query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    params.push(itemsPerPage, offset);

    const [products] = await pool.query<RowDataPacket[]>(query, params);

    res.json({
      data: products,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems,
        totalPages,
      },
      message: "success",
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ data: null, message: "Product not found" });
    }
    res.json({ data: products[0], message: "success" });
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

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO products (name, description, price, category, image, stock, sizes, colors)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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

    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM products WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json({ data: products[0], message: "success" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
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
       WHERE id = ?`,
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
      "SELECT * FROM products WHERE id = ?",
      [id]
    );
    res.json({ data: products[0], message: "success" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM products WHERE id = ?",
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

    res.json({ data: categories.map((c) => c.category), message: "success" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
