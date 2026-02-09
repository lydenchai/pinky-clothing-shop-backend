import { Request, Response } from "express";
import { Shipping } from "../models/Shipping";
import { generateObjectId } from "../utils/objectid.util";
import { generateCode } from "../utils/code.util";
import { Op, WhereOptions } from "sequelize";

// Get all shippings with pagination and search
function buildShippingWhereClause({ search, code, description, q }: any) {
  let effectiveSearch = search;
  if (!effectiveSearch && q) effectiveSearch = q;
  const whereClause: WhereOptions = {};
  if (effectiveSearch) {
    const s = `%${effectiveSearch}%`;
    (whereClause as any)[Op.or] = [
      { code: { [Op.like]: s } },
      { name: { [Op.like]: s } },
      { description: { [Op.like]: s } }
    ];
  }

  if (code) {
    whereClause.code = { [Op.like]: `%${code}%` };
  }

  if (description) {
    whereClause.description = { [Op.like]: `%${description}%` };
  }

  return whereClause;
}

// Get all shippings with pagination and search
export const getAllShippings = async (req: Request, res: Response) => {
  try {
    const { code, description, page, limit, search, q } = req.query;
    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;
    const whereClause = buildShippingWhereClause({ search, code, description, q });
    const { count, rows } = await Shipping.findAndCountAll({
      where: whereClause,
      order: [['_id', 'DESC']],
      limit: itemsPerPage,
      offset: offset
    });
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems: count,
        totalPages: Math.ceil(count / itemsPerPage),
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
    const item = await Shipping.findByPk(req.params.id);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Shipping item not found" });
    }
    res.json({ success: true, data: item });
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
      code,
    } = req.body;
    // Generate _id if not provided
    const _id = req.body._id || generateObjectId();
    const shippingCode = code?.trim() ? code.trim() : generateCode(0, "S");
    const newItem = await Shipping.create({
      _id,
      code: shippingCode,
      name,
      description,
      country,
      price,
      min_order,
      max_order,
      estimated_days,
      active
    });
    res
      .status(201)
      .json({ data: newItem, success: true });
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
    const shipping = await Shipping.findByPk(req.params.id);
    if (!shipping)
      return res
        .status(404)
        .json({ data: null, message: "Shipping not found" });
    await shipping.update(req.body);
    res.json({
      data: shipping,
      success: true,
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: "Failed to update shipping" });
    console.error(error);
  }
};

// Delete shipping
export const deleteShipping = async (req: Request, res: Response) => {
  try {
    const deletedCount = await Shipping.destroy({
      where: { _id: req.params.id }
    });
    if (deletedCount === 0)
      return res
        .status(404)
        .json({ data: null, message: "Shipping not found" });
    res.json({
      data: null,
      message: "Shipping deleted successfully",
      success: true,
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: "Failed to delete shipping" });
    console.error(error);
  }
};
