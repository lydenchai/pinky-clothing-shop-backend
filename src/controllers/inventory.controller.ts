import { Request, Response } from "express";
import { pool } from "../config/database";

export const getAllInventory = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10) || 1;
    const limit = parseInt((req.query.limit as string) || "15", 10) || 15;
    const offset = (page - 1) * limit;

    // total count
    const [countRows] = await pool.query(
      "SELECT COUNT(*) as total FROM inventory"
    );
    const total =
      Array.isArray(countRows) && (countRows as any)[0]
        ? (countRows as any)[0].total
        : 0;

    // paginated rows
    const [rows] = await pool.query(
      "SELECT * FROM inventory ORDER BY updatedAt DESC, id DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );

    res.json({
      data: Array.isArray(rows) ? rows : [],
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch inventory", error: err });
  }
};

export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory WHERE id = ?", [
      req.params.id,
    ]);
    const item = Array.isArray(rows) ? rows[0] : null;
    if (!item)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json({ data: item, message: "success" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch inventory item", error: err });
  }
};

export const createInventory = async (req: Request, res: Response) => {
  try {
    const { productId, quantity, location } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory (productId, quantity, location) VALUES (?, ?, ?)",
      [productId, quantity, location]
    );
    const insertId = (result as any).insertId;
    const [rows] = await pool.query("SELECT * FROM inventory WHERE id = ?", [
      insertId,
    ]);
    res
      .status(201)
      .json({ data: Array.isArray(rows) ? rows[0] : null, message: "success" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create inventory item", error: err });
  }
};

export const updateInventory = async (req: Request, res: Response) => {
  try {
    const { quantity, location } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory SET quantity = ?, location = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [quantity, location, req.params.id]
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    const [rows] = await pool.query("SELECT * FROM inventory WHERE id = ?", [
      req.params.id,
    ]);
    res.json(Array.isArray(rows) ? rows[0] : null);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update inventory item", error: err });
  }
};

export const deleteInventory = async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query("DELETE FROM inventory WHERE id = ?", [
      req.params.id,
    ]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json({ message: "Inventory item deleted" });
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
      "SELECT quantity FROM inventory WHERE id = ?",
      [req.params.id]
    )) as [import("mysql2").RowDataPacket[], any];
    const item = Array.isArray(rows) ? rows[0] : null;
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    const newQuantity = item.quantity + amount;
    await pool.query(
      "UPDATE inventory SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [newQuantity, req.params.id]
    );
    const [updatedRows] = await pool.query(
      "SELECT * FROM inventory WHERE id = ?",
      [req.params.id]
    );
    res.json(Array.isArray(updatedRows) ? updatedRows[0] : null);
  } catch (err) {
    res.status(500).json({ message: "Failed to adjust stock", error: err });
  }
};
