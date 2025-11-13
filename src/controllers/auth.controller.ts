import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { config } from '../config';
import { User, UserResponse } from '../models/user.model';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../middleware/auth.middleware';

export const registerValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, address, city, postalCode, country, phone } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, password, firstName, lastName, address, city, postalCode, country, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, firstName, lastName, address || null, city || null, postalCode || null, country || null, phone || null]
    );

    const userId = result.insertId;

    // Generate token
    const token = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as SignOptions);

    // Get created user
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, firstName, lastName, address, city, postalCode, country, phone, createdAt FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0] as UserResponse;

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, password, firstName, lastName, address, city, postalCode, country, phone FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0] as User & { id: number };

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as SignOptions);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, firstName, lastName, address, city, postalCode, country, phone, createdAt FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, address, city, postalCode, country, phone } = req.body;

    await pool.query(
      `UPDATE users SET firstName = ?, lastName = ?, address = ?, city = ?, postalCode = ?, country = ?, phone = ?
       WHERE id = ?`,
      [firstName, lastName, address || null, city || null, postalCode || null, country || null, phone || null, req.userId]
    );

    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, firstName, lastName, address, city, postalCode, country, phone FROM users WHERE id = ?',
      [req.userId]
    );

    res.json(users[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
