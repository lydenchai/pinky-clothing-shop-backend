import { Response } from "express";
import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateObjectId } from "./auth.controller";

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, search } = req.query;

    // Pagination parameters
    const currentPage = parseInt(page as string) || 1;
    const itemsPerPage = parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;

    let query =
      "SELECT _id, email, first_name, last_name, address, city, country, phone, role, created_at FROM users WHERE 1=1";
    const params: any[] = [];

    if (search) {
      query += " AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count for pagination
    const countQuery = query.replace(
      "SELECT _id, email, first_name, last_name, address, city, country, phone, role, created_at",
      "SELECT COUNT(*) as total"
    );
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, params);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Add pagination to query
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(itemsPerPage, offset);

    const [users] = await pool.query<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      address,
      city,
      postal_code,
      country,
      phone,
      role,
    } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        data: null,
        message: "Missing required fields",
      });
    }

    const userRole = ["admin", "customer"].includes(role) ? role : "customer";

    // 🔎 Check duplicate email
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT _id FROM users WHERE email = ?",
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        data: null,
        message: "Email already exists",
      });
    }

    // 🔐 Hash password
    const hashedPassword = await import("bcryptjs").then((bcrypt) =>
      bcrypt.hash(password, 10)
    );

    // 🆔 Mongo-style ObjectId
    const userId = generateObjectId();

    await pool.query<ResultSetHeader>(
      `INSERT INTO users
       (_id, email, password, first_name, last_name, address, city, postal_code, country, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        email.toLowerCase(),
        hashedPassword,
        first_name,
        last_name,
        address || null,
        city || null,
        postal_code || null,
        country || null,
        phone || null,
        userRole,
      ]
    );

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT _id, email, first_name, last_name, address, city,
              postal_code, country, phone, role, created_at
       FROM users WHERE _id = ?`,
      [userId]
    );
    res.status(201).json({ data: users[0], success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ data: null, message: "error" });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT _id, email, first_name, last_name, postal_code, address, city, country, phone, role, created_at FROM users WHERE _id = ?",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ data: null, message: "User not found" });
    }
    res.json({ data: users[0], success: true });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "first_name",
      "last_name",
      "address",
      "city",
      "postal_code",
      "country",
      "phone",
    ];

    const fields: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(req.body[field] || null);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        data: null,
        message: "No valid fields provided for update",
      });
    }

    values.push(id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET ${fields.join(", ")} WHERE _id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "User not found" });
    }

    // Return updated user
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT _id, email, first_name, last_name, address, city, postal_code,
              country, phone, role, created_at
       FROM users WHERE _id = ?`,
      [id]
    );

    res.json({
      data: users[0],
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ data: null, message: "error" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM users WHERE _id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "User not found" });
    }
    res.json({ data: null, success: true });
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
      "UPDATE users SET role = ? WHERE _id = ?",
      [role, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ data: null, message: "User not found" });
    }
    res.json({ data: null, success: true });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
  }
};
