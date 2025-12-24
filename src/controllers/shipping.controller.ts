import { Request, Response } from "express";
import { pool } from "../config/database";

// Get all shippings with pagination and search
export const getAllShippings = async (req: Request, res: Response) => {
  try {
    let { page, limit, search, q } = req.query;
    if (!search && q) search = q;
    const currentPage = parseInt(page as string) || 1;
    const itemsPerPage = parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Get shipping by ID
export const getShippingById = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// Create shipping
export const createShipping = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: "Failed to create shipping" });
  }
};

// Update shipping
export const updateShipping = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: "Failed to update shipping" });
  }
};

// Delete shipping
export const deleteShipping = async (req: Request, res: Response) => {
  try {
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: "Failed to delete shipping" });
  }
};
