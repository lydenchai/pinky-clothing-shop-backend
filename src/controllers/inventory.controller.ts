import { Request, Response } from "express";
import { generateObjectId } from "../utils/objectid.util";
import { generateCode } from "../utils/code.util";
import { Inventory } from "../models/Inventory";
import { InventoryLog } from "../models/InventoryLog";
import { Product } from "../models/Product";
import { Op, WhereOptions, fn, col, literal } from "sequelize";

// Build search clause for inventory queries
function buildInventoryWhereClause(code: any, search: any, q: any) {
  let searchStr = search;
  if (!searchStr && q) searchStr = q;
  const whereClause: WhereOptions = {};
  if (code) {
    let codeStr: string | undefined;
    if (typeof code === "string" || typeof code === "number") {
      codeStr = String(code);
    }
    if (codeStr) {
      whereClause["code" as any] = { [Op.like]: `%${codeStr}%` };
    }
  }

  if (searchStr) {
    const s = `%${searchStr}%`;
    (whereClause as any)[Op.or] = [
      { code: { [Op.like]: s } },
      { location: { [Op.like]: s } },
      { "$product.name$": { [Op.like]: s } }, // Querying associated model
    ];
  }
  return whereClause;
}

// Get all inventory items with pagination and search
export const getAllInventory = async (req: Request, res: Response) => {
  try {
    let { code, page, limit, search, q } = req.query;

    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    const whereClause = buildInventoryWhereClause(code, search, q);

    const { count, rows } = await Inventory.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          attributes: ["_id", "name"],
        },
      ],
      limit: itemsPerPage,
      offset: offset,
      order: [
        ["updated_at", "DESC"],
        ["_id", "DESC"],
      ],
    });

    const data = rows.map((item) => {
      const json = item.toJSON();
      return {
        _id: json._id,
        code: json.code,
        quantity: json.quantity,
        location: json.location,
        created_at: json.created_at,
        updated_at: json.updated_at,
        product: json.product
          ? { _id: json.product._id, name: json.product.name }
          : null,
      };
    });

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
  } catch (err) {
    console.error("getAllInventory error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
      error: err,
    });
  }
};

// Get inventory item by ID
export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const item = await Inventory.findByPk(req.params.id, {
      include: [
        {
          model: Product,
          attributes: ["_id", "name"],
        },
      ],
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    const json = item.toJSON();
    const inventoryItem = {
      _id: json._id,
      code: json.code,
      quantity: json.quantity,
      location: json.location,
      created_at: json.created_at,
      updated_at: json.updated_at,
      product: json.product
        ? { _id: json.product._id, name: json.product.name }
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

// Create a new inventory item
export const createInventory = async (req: Request, res: Response) => {
  try {
    const { product_id, quantity, location, code } = req.body;

    // Generate _id if not provided
    const _id = req.body._id || generateObjectId();
    const inventoryCode = code?.trim() ? code.trim() : generateCode(0, "I");

    const newItem = await Inventory.create({
      _id,
      code: inventoryCode,
      product_id,
      quantity,
      location,
    });

    res.status(201).json({
      data: {
        _id: newItem._id,
        code: newItem.code,
        quantity: newItem.quantity,
        location: newItem.location,
        created_at: newItem.created_at,
        updated_at: newItem.updated_at,
        product_id: newItem.product_id,
      },
      success: true,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create inventory item", error: err });
  }
};

// Update an existing inventory item
export const updateInventory = async (req: Request, res: Response) => {
  try {
    const { quantity, location, product_id } = req.body;
    const { id: _id } = req.params;

    const item = await Inventory.findByPk(_id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    if (quantity !== undefined) item.quantity = quantity;
    if (location !== undefined) item.location = location;
    if (product_id !== undefined) item.product_id = product_id;

    await item.save();

    res.json({
      data: {
        _id: item._id,
        code: item.code,
        quantity: item.quantity,
        location: item.location,
        created_at: item.created_at,
        updated_at: item.updated_at,
        product_id: item.product_id,
      },
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update inventory",
      error: err,
    });
  }
};

// Delete an inventory item
export const deleteInventory = async (req: Request, res: Response) => {
  try {
    const deletedCount = await Inventory.destroy({
      where: { _id: req.params.id },
    });

    if (deletedCount === 0) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    res.json({ data: null, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete inventory item", error: err });
  }
};

// Adjust stock quantity of an inventory item
export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const item = await Inventory.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const previous_quantity = item.quantity;
    const new_quantity = item.quantity + amount;
    if (new_quantity < 0) {
      return res
        .status(400)
        .json({ message: "Insufficient stock. Cannot reduce below zero." });
    }

    item.quantity = new_quantity;
    await item.save();

    // Log the stock movement
    await InventoryLog.create({
      inventory_id: item._id,
      action:
        amount > 0
          ? amount === 1
            ? "stock_in"
            : "adjustment"
          : amount < 0
            ? amount === -1
              ? "stock_out"
              : "adjustment"
            : "adjustment",
      amount,
      previous_quantity,
      new_quantity,
      note: "",
    });

    res.json({
      data: {
        _id: item._id,
        code: item.code,
        quantity: item.quantity,
        location: item.location,
        created_at: item.created_at,
        updated_at: item.updated_at,
        product_id: item.product_id,
      },
      success: true,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to adjust stock", error: err });
  }
};

// Get inventory movement logs for a given inventory item
export const getInventoryLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await InventoryLog.findAll({
      where: { inventory_id: id },
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: logs });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch inventory logs", error: err });
  }
};

// GET /inventory/stock-movement-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getStockMovementSummary = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const where: any = {};
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from as string);
      if (to) where.created_at[Op.lte] = new Date(to as string);
    }
    // Only stock_in and stock_out
    where.action = { [Op.in]: ["stock_in", "stock_out"] };
    const rows = await InventoryLog.findAll({
      attributes: [
        [fn("DATE", col("created_at")), "date"],
        "action",
        [fn("SUM", col("amount")), "total"],
      ],
      where,
      group: [fn("DATE", col("created_at")), "action"],
      order: [[literal("date"), "ASC"]],
    });
    // Format as { date, stock_in, stock_out }
    const summary: Record<
      string,
      { date: string; stock_in: number; stock_out: number }
    > = {};
    for (const row of rows) {
      const { date, action, total } = row.get() as any;
      if (!summary[date]) summary[date] = { date, stock_in: 0, stock_out: 0 };
      if (action === "stock_in") summary[date].stock_in = Number(total);
      if (action === "stock_out") summary[date].stock_out = Number(total);
    }
    res.json({ success: true, data: Object.values(summary) });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch stock movement summary", error: err });
  }
};
