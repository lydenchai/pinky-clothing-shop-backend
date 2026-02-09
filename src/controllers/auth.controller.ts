import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { config } from "../config";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateObjectId } from "../utils/objectid.util";

// Validation rules for registration and login
export const registerValidation = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("first_name").notEmpty().withMessage("First name is required"),
  body("last_name").notEmpty().withMessage("Last name is required"),
];

// Validation rules for login
export const loginValidation = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Register a new user
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
      phone,
    } = req.body;

    // address: { street, city, postal_code, country }
    let addressJson = null;
    if (address && typeof address === 'object') {
      addressJson = JSON.stringify(address);
    } else if (typeof address === 'string') {
      addressJson = address;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    // Generate MongoDB-style ObjectId for new user
    const newuser_id = generateObjectId();

    const newUser = await User.create({
      _id: newuser_id,
      email,
      password: hashedPassword,
      first_name,
      last_name,
      address: addressJson,
      phone: phone || null,
      role: 'customer',
    });

    // Generate token
    const token = jwt.sign({ user_id: newuser_id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);

    // Get created user (ensure we return what front-end expects)
    const userToReturn = {
      _id: newUser._id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      address: newUser.address,
      phone: newUser.phone,
      role: newUser.role
    };

    res.status(201).json({ token, user: userToReturn });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error during registration" });
    console.error(error);
  }
};

// User login
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
    const user = await User.findOne({ where: { email } });

    console.log("DB query returned user:", user ? "Found" : "Not Found");
    if (!user) {
      console.log(`Login failed: User not found for email ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

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
    const userWithoutPassword = {
      _id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      address: user.address,
      phone: user.phone,
      role: user.role
    };

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

// User logout (client should simply discard token)
export const logout = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: "success" });
};

// Get user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.user_id, {
      attributes: ["_id", "email", "first_name", "last_name", "address", "phone", "role", "created_at"]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let addressObj = {};
    try {
      addressObj = user.address ? JSON.parse(user.address) : {};
    } catch { }

    res.json({
      data: {
        _id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        address: addressObj,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      address,
      phone,
    } = req.body;

    let addressJson = null;
    if (address && typeof address === 'object') {
      addressJson = JSON.stringify(address);
    } else if (typeof address === 'string') {
      addressJson = address;
    }

    const updates: any = {
      first_name,
      last_name,
      address: addressJson,
      phone: phone || null
    };

    await User.update(updates, {
      where: { _id: req.user_id }
    });

    const user = await User.findByPk(req.user_id, {
      attributes: ["_id", "email", "first_name", "last_name", "address", "phone", "role"]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ data: user, success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.error(error);
  }
};
