import { Request, Response } from "express";
import { pool } from "../config/database";
import crypto from "crypto";

function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = crypto.randomBytes(8).toString("hex");
  return timestamp + random;
}

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

    // paginated rows with product name populated
    const [rows] = await pool.query(
      `SELECT inventory.*, products.name as product_name
       FROM inventory
       LEFT JOIN products ON inventory.product_id = products._id
       ORDER BY inventory.updated_at DESC, inventory._id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
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
    const [rows] = await pool.query("SELECT * FROM inventory WHERE _id = ?", [
      req.params.id,
    ]);
    const item = Array.isArray(rows) ? rows[0] : null;
    if (!item)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json({ data: item, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch inventory item", error: err });
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
