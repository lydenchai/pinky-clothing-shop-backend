import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { pool } from "../config/database";
import { config } from "../config";
import { User, UserResponse } from "../models/user.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AuthRequest } from "../middleware/auth.middleware";

export const registerValidation = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
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
      firstName,
      lastName,
      address,
      city,
      postalCode,
      country,
      phone,
    } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, password, firstName, lastName, address, city, postalCode, country, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'customer')`,
      [
        email,
        hashedPassword,
        firstName,
        lastName,
        address || null,
        city || null,
        postalCode || null,
        country || null,
        phone || null,
      ]
    );

    const userId = result.insertId;

    // Generate token
    const token = jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);

    // Get created user
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, email, firstName, lastName, address, city, postalCode, country, phone, role, createdAt FROM users WHERE id = ?",
      [userId]
    );

    const user = users[0] as UserResponse;

    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error during registration" });
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
      "SELECT id, email, password, firstName, lastName, address, city, postalCode, country, phone, role FROM users WHERE email = ?",
      [email]
    );

    console.log('DB query returned user count:', (users as any[]).length);
    if (users.length === 0) {
      console.log(`Login failed: User not found for email ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0] as User & { id: number };

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`Login failed: Invalid password for user ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    // Log the error for debugging (do not expose stack in production)
    console.error('Error in login controller:', error);
    const message = (error as Error).message || 'Internal Server Error during login';
    if (config.nodeEnv === 'production') {
      res.status(500).json({ error: 'Internal Server Error during login' });
    } else {
      res.status(500).json({ error: 'Internal Server Error during login', details: message });
    }
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, email, firstName, lastName, address, city, postalCode, country, phone, role, createdAt FROM users WHERE id = ?",
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, address, city, postalCode, country, phone } =
      req.body;

    await pool.query(
      `UPDATE users SET firstName = ?, lastName = ?, address = ?, city = ?, postalCode = ?, country = ?, phone = ?
       WHERE id = ?`,
      [
        firstName,
        lastName,
        address || null,
        city || null,
        postalCode || null,
        country || null,
        phone || null,
        req.userId,
      ]
    );

    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, email, firstName, lastName, address, city, postalCode, country, phone, role FROM users WHERE id = ?",
      [req.userId]
    );

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
