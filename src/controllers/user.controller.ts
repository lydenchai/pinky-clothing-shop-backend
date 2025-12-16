import { Response } from "express";
import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AuthRequest } from "../middleware/auth.middleware";

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, search } = req.query;

    // Pagination parameters
    const currentPage = parseInt(page as string) || 1;
    const itemsPerPage = parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    let query =
      "SELECT id, email, firstName, lastName, address, city, country, phone, role, createdAt FROM users WHERE 1=1";
    const params: any[] = [];

    if (search) {
      query += " AND (email LIKE ? OR firstName LIKE ? OR lastName LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count for pagination
    const countQuery = query.replace(
      "SELECT id, email, firstName, lastName, address, city, country, phone, createdAt",
      "SELECT COUNT(*) as total"
    );
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Add pagination to query
    query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    params.push(itemsPerPage, offset);

    const [users] = await pool.query<RowDataPacket[]>(query, params);

    res.json({
      data: users,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems,
        totalPages,
      },
      message: "success",
    });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, email, firstName, lastName, address, city, country, phone, role, createdAt FROM users WHERE id = ?",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ data: null, message: "User not found" });
    }
    res.json({ data: users[0], message: "success" });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM users WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "User not found" });
    }
    res.json({ data: null, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!["admin", "customer"].includes(role)) {
      return res.status(400).json({ data: null, message: "Invalid role" });
    }
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "User not found" });
    }
    res.json({ data: null, message: "Role updated successfully" });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
  }
};
