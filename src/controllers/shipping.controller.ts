import { Request, Response } from "express";
import { pool } from "../config/database";
import { generateObjectId } from "./auth.controller";

// Get all shippings with pagination and search
export const getAllShippings = async (req: Request, res: Response) => {
  try {
    let { page, limit, search, q } = req.query;
    if (!search && q) search = q;
    const currentPage = parseInt(page as string) || 1;
    const itemsPerPage = parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;
    let searchClause = "";
    let searchParams: any[] = [];
    if (search) {
      searchClause = " WHERE name LIKE ? OR description LIKE ?";
      const s = `%${search}%`;
      searchParams = [s, s];
    }
    // Total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM shippings${searchClause}`,
      searchParams
    );
    const total =
      Array.isArray(countRows) && (countRows as any)[0]
        ? (countRows as any)[0].total
        : 0;
    // Paginated rows (fix: order by _id only)
    const [rows] = await pool.query(
      `SELECT * FROM shippings
       ${searchClause}
       ORDER BY _id DESC
       LIMIT ? OFFSET ?`,
      [...searchParams, Number(itemsPerPage), Number(offset)]
    );
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems: total,
        totalPages: Math.ceil(total / itemsPerPage),
      },
    });
  } catch (error) {
    console.error("Shipping getAllShippings error:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
};

// Get shipping by ID
export const getShippingById = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT * FROM shippings WHERE _id = ?", [
      req.params.id,
    ]);

    const item = (rows as any[])[0];
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    const shippingItem = {
      _id: item._id,
      name: item.name,
      description: item.description,
      country: item.country,
      price: item.price,
      min_order: item.min_order,
      max_order: item.max_order,
      estimated_days: item.estimated_days,
      active: item.active,
      product: item.product_id
        ? { _id: item.product_id, name: item.product_name }
        : null,
    };

    res.json({ success: true, data: shippingItem });
  } catch (err) {
    console.error("getShippingById error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shipping item",
      error: err,
    });
  }
};

// Create shipping
export const createShipping = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      country,
      price,
      min_order,
      max_order,
      estimated_days,
      active,
    } = req.body;
    // Generate _id if not provided
    const _id = req.body._id || generateObjectId();
    const [result] = await pool.query(
      "INSERT INTO shippings (_id, name, description, country, price, min_order, max_order, estimated_days, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        _id,
        name,
        description,
        country,
        price,
        min_order,
        max_order,
        estimated_days,
        active,
      ]
    );
    const [rows] = await pool.query("SELECT * FROM shippings WHERE _id = ?", [
      _id,
    ]);
    res
      .status(201)
      .json({ data: Array.isArray(rows) ? rows[0] : null, success: true });
  } catch (error) {
    console.error("Shipping createShipping error:", error);
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    res.status(400).json({ success: false, error: errorMessage });
  }
};

// Update shipping
export const updateShipping = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT * FROM shippings WHERE _id = ?", [
      req.params.id,
    ]);
    const shipping = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!shipping)
      return res
        .status(404)
        .json({ data: null, message: "Shipping not found" });
    await pool.query("UPDATE shippings SET ? WHERE _id = ?", [
      req.body,
      req.params.id,
    ]);
    // Return the updated row
    const [updatedRows] = await pool.query(
      "SELECT * FROM shippings WHERE _id = ?",
      [req.params.id]
    );
    res.json({
      data: Array.isArray(updatedRows) ? updatedRows[0] : null,
      success: true,
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: "Failed to update shipping" });
  }
};

// Delete shipping
export const deleteShipping = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT * FROM shippings WHERE _id = ?", [
      req.params.id,
    ]);
    const shipping = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!shipping)
      return res
        .status(404)
        .json({ data: null, message: "Shipping not found" });
    await pool.query("DELETE FROM shippings WHERE _id = ?", [req.params.id]);
    res.json({
      data: null,
      message: "Shipping deleted successfully",
      success: true,
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: "Failed to delete shipping" });
  }
};
