import { Request, Response } from "express";
import { pool } from "../config/database";
import { generateObjectId } from "./auth.controller";

export const getAllInventory = async (req: Request, res: Response) => {
  try {
    let { page, limit, search, q } = req.query;
    if (!search && q) search = q;

    // Pagination parameters
    const currentPage = parseInt(page as string) || 1;
    const itemsPerPage = parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    // Add search filter if present
    let searchClause = "";
    let searchParams: any[] = [];
    if (search) {
      searchClause =
        " WHERE (inventory._id LIKE ? OR products.name LIKE ? OR inventory.location LIKE ?)";
      const s = `%${search}%`;
      searchParams = [s, s, s];
    }

    // Total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM inventory LEFT JOIN products ON inventory.product_id = products._id${searchClause}`,
      searchParams
    );

    const total =
      Array.isArray(countRows) && (countRows as any)[0]
        ? (countRows as any)[0].total
        : 0;
    // Paginated rows with product info populated
    const [rows] = await pool.query(
      `SELECT inventory.*, products._id AS product_id, products.name AS product_name
       FROM inventory
       LEFT JOIN products ON inventory.product_id = products._id
       ${searchClause}
       ORDER BY inventory.updated_at DESC, inventory._id DESC
       LIMIT ? OFFSET ?`,
      [...searchParams, Number(itemsPerPage), Number(offset)]
    );

    // Map rows to include product object
    const data = (rows as any[]).map((row) => ({
      _id: row._id,
      quantity: row.quantity,
      location: row.location,
      created_at: row.created_at,
      updated_at: row.updated_at,
      product: row.product_id
        ? { _id: row.product_id, name: row.product_name }
        : null,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit: itemsPerPage,
        totalItems: total,
        totalPages: Math.ceil(total / itemsPerPage),
      },
    });
  } catch (err) {
    console.error("getAllInventory error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
      error: err,
    });
  }
};

import { RowDataPacket } from "mysql2";

export const getInventoryById = async (req: Request, res: Response) => {
  try {
    // Tell TypeScript the query returns RowDataPacket[]
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT inventory.*, products._id AS product_id, products.name AS product_name
       FROM inventory
       LEFT JOIN products ON inventory.product_id = products._id
       WHERE inventory._id = ?`,
      [req.params.id]
    );

    const item = rows[0];
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    const inventoryItem = {
      _id: item._id,
      quantity: item.quantity,
      location: item.location,
      created_at: item.created_at,
      updated_at: item.updated_at,
      product: item.product_id
        ? { _id: item.product_id, name: item.product_name }
        : null,
    };

    res.json({ success: true, data: inventoryItem });
  } catch (err) {
    console.error("getInventoryById error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory item",
      error: err,
    });
  }
};

export const createInventory = async (req: Request, res: Response) => {
  try {
    const { product_id, quantity, location } = req.body;
    // Generate _id if not provided
    const _id = req.body._id || generateObjectId();
    const [result] = await pool.query(
      "INSERT INTO inventory (_id, product_id, quantity, location) VALUES (?, ?, ?, ?)",
      [_id, product_id, quantity, location]
    );
    const [rows] = await pool.query("SELECT * FROM inventory WHERE _id = ?", [
      _id,
    ]);
    res
      .status(201)
      .json({ data: Array.isArray(rows) ? rows[0] : null, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create inventory item", error: err });
  }
};

export const updateInventory = async (req: Request, res: Response) => {
  try {
    const { quantity, location, product_id } = req.body;
    const { id: _id } = req.params;

    // Build dynamic update fields
    const fields = [];
    const values = [];
    if (typeof quantity !== "undefined") {
      fields.push("quantity = ?");
      values.push(quantity);
    }
    if (typeof location !== "undefined") {
      fields.push("location = ?");
      values.push(location);
    }
    if (typeof product_id !== "undefined") {
      fields.push("product_id = ?");
      values.push(product_id);
    }
    fields.push("updated_at = CURRENT_TIMESTAMP");

    const sql = `UPDATE inventory SET ${fields.join(", ")} WHERE _id = ?`;
    values.push(_id);

    const [result] = await pool.query(sql, values);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const [rows] = await pool.query(`SELECT * FROM inventory WHERE _id = ?`, [
      _id,
    ]);
    res.json({
      data: Array.isArray(rows) ? rows[0] : null,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update inventory",
      error: err,
    });
  }
};

export const deleteInventory = async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query("DELETE FROM inventory WHERE _id = ?", [
      req.params._id,
    ]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json({ data: null, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete inventory item", error: err });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    // Get current quantity
    const [rows] = (await pool.query(
      "SELECT quantity FROM inventory WHERE _id = ?",
      [req.params._id]
    )) as [import("mysql2").RowDataPacket[], any];
    const item = Array.isArray(rows) ? rows[0] : null;
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    const newQuantity = item.quantity + amount;
    await pool.query(
      "UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE _id = ?",
      [newQuantity, req.params._id]
    );
    const [updatedRows] = await pool.query(
      "SELECT * FROM inventory WHERE _id = ?",
      [req.params._id]
    );
    res.json({
      data: Array.isArray(updatedRows) ? updatedRows[0] : null,
      success: true,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to adjust stock", error: err });
  }
};
