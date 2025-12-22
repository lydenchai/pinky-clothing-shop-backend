import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { pool } from "../config/database";
import { config } from "../config";
import { User, UserResponse } from "../models/user.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AuthRequest } from "../middleware/auth.middleware";
import crypto from "crypto";

export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = crypto.randomBytes(8).toString("hex");
  return timestamp + random; // 24 chars
}

export const registerValidation = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("first_name").notEmpty().withMessage("First name is required"),
  body("last_name").notEmpty().withMessage("Last name is required"),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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
    } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      "SELECT _id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    // Generate MongoDB-style ObjectId for new user
    const newuser_id = generateObjectId();
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (_id, email, password, first_name, last_name, address, city, postal_code, country, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'customer')`,
      [
        newuser_id,
        email,
        hashedPassword,
        first_name,
        last_name,
        address || null,
        city || null,
        postal_code || null,
        country || null,
        phone || null,
      ]
    );

    // Generate token
    const token = jwt.sign({ user_id: newuser_id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);

    // Get created user
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT _id, email, first_name, last_name, address, city, postal_code, country, phone, role FROM users WHERE _id = ?",
      [newuser_id]
    );

    const user = users[0] as UserResponse;

    res.status(201).json({ token, user });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error during registration" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Debug: log login attempt (do not log password)
    console.log(`Login attempt for email: ${email}`);
    // Find user
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT _id, email, password, first_name, last_name, address, city, postal_code, country, phone, role FROM users WHERE email = ?",
      [email]
    );

    console.log("DB query returned user count:", (users as any[]).length);
    if (users.length === 0) {
      console.log(`Login failed: User not found for email ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0] as User & { _id: string };

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`Login failed: Invalid password for user ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign({ user_id: user._id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword, success: true });
  } catch (error) {
    // Log the error for debugging (do not expose stack in production)
    console.error("Error in login controller:", error);
    const message =
      (error as Error).message || "Internal Server Error during login";
    if (config.nodeEnv === "production") {
      res.status(500).json({ error: "Internal Server Error during login" });
    } else {
      res.status(500).json({
        error: "Internal Server Error during login",
        details: message,
      });
    }
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: "success" });
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT _id, email, first_name, last_name, address, city, postal_code, country, phone, role, created_at FROM users WHERE _id = ?",
      [req.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ data: users[0], success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      address,
      city,
      postal_code,
      country,
      phone,
    } = req.body;

    await pool.query(
      `UPDATE users SET first_name = ?, last_name = ?, address = ?, city = ?, postal_code = ?, country = ?, phone = ?
       WHERE _id = ?`,
      [
        first_name,
        last_name,
        address || null,
        city || null,
        postal_code || null,
        country || null,
        phone || null,
        req.user_id,
      ]
    );

    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT _id, email, first_name, last_name, address, city, postal_code, country, phone, role FROM users WHERE _id = ?",
      [req.user_id]
    );

    res.json({ data: users[0], success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
