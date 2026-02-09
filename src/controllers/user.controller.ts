import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { User } from "../models/User";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";

// Get all users with pagination and search
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    let { page, limit, search, q } = req.query;
    if (!search && q) search = q;
    const currentPage = Number.parseInt(page as string) || 1;
    const itemsPerPage = Number.parseInt(limit as string) || 15;
    const offset = (currentPage - 1) * itemsPerPage;
    const whereClause: any = {};
    if (search) {
      let searchStr: string;
      if (
        typeof search === "string" ||
        typeof search === "number" ||
        typeof search === "boolean"
      ) {
        searchStr = String(search);
      } else {
        searchStr = "";
      }
      const searchTerm = `%${searchStr}%`;
      whereClause[Op.or] = [
        { email: { [Op.like]: searchTerm } },
        { first_name: { [Op.like]: searchTerm } },
        { last_name: { [Op.like]: searchTerm } },
      ];
    }
    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit: itemsPerPage,
      offset: offset,
      order: [["created_at", "DESC"]],
      attributes: [
        "_id",
        "email",
        "first_name",
        "last_name",
        "address",
        "phone",
        "role",
        "created_at",
      ],
    });
    const usersWithAddress = rows.map((user) => {
      let addressObj = {};
      try {
        addressObj = user.address ? JSON.parse(user.address) : {};
      } catch {}
      return {
        _id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        address: addressObj,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      };
    });
    res.json({
      success: true,
      data: usersWithAddress,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems: count,
        totalPages: Math.ceil(count / itemsPerPage),
      },
    });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
    console.error(error);
  }
};

// Create a new user
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      address,
      phone,
      role,
      is_active,
      is_blocked,
    } = req.body;
    let addressJson = null;
    if (address && typeof address === "object") {
      addressJson = JSON.stringify(address);
    } else if (typeof address === "string") {
      addressJson = address;
    }
    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const userRole = ["admin", "staff", "customer"].includes(role)
      ? role
      : "customer";
    const existing = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      first_name,
      last_name,
      address: addressJson,
      phone,
      role: userRole,
      is_active: is_active !== undefined ? is_active : true,
      is_blocked: is_blocked !== undefined ? is_blocked : false,
    });
    // Return created user (exclude password)
    const createdUser = await User.findByPk(newUser._id, {
      attributes: [
        "_id",
        "email",
        "first_name",
        "last_name",
        "address",
        "phone",
        "role",
        "is_active",
        "is_blocked",
        "created_at",
      ],
    });
    res.status(201).json({ data: createdUser, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ data: null, message: "error" });
  }
};

// Get user by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: [
        "_id",
        "email",
        "first_name",
        "last_name",
        "address",
        "phone",
        "role",
        "is_active",
        "is_blocked",
        "created_at",
      ],
    });

    if (!user) {
      return res.status(404).json({ data: null, message: "User not found" });
    }

    let addressObj = {};
    try {
      addressObj = user.address ? JSON.parse(user.address) : {};
    } catch {}

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
    res.status(500).json({ data: null, message: "error" });
    console.error(error);
  }
};

const prepareUserUpdates = (body: any) => {
  const allowedFields = [
    "first_name",
    "last_name",
    "email",
    "address",
    "phone",
    "role",
  ];
  const updates: any = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "address" && typeof body[field] === "object") {
        updates[field] = JSON.stringify(body[field]);
      } else {
        updates[field] = body[field] || null;
      }
    }
  }
  return updates;
};

const getFormattedUserById = async (id: string) => {
  const user = await User.findByPk(id, {
    attributes: [
      "_id",
      "email",
      "first_name",
      "last_name",
      "address",
      "phone",
      "role",
      "created_at",
    ],
  });

  if (!user) return null;

  let addressObj = {};
  try {
    addressObj = user.address ? JSON.parse(user.address) : {};
  } catch {}

  return {
    _id: user._id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    address: addressObj,
    phone: user.phone,
    role: user.role,
    created_at: user.created_at,
  };
};

// Update an existing user
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = prepareUserUpdates(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        data: null,
        message: "No valid fields provided for update",
      });
    }

    // Check if new email is already taken by another user
    if (updates.email) {
      const existingUser = await User.findOne({
        where: {
          email: updates.email,
          _id: { [Op.ne]: id }, // Exclude current user
        },
      });

      if (existingUser) {
        return res.status(409).json({
          data: null,
          message: "Email already exists",
        });
      }
    }

    const [affectedRows] = await User.update(updates, {
      where: { _id: id },
    });

    if (affectedRows === 0) {
      // Check if user exists to distinguish between "not found" and "no changes"
      const userExists = await User.findByPk(id);
      if (!userExists) {
        return res.status(404).json({ data: null, message: "User not found" });
      }
    }

    const updatedUser = await getFormattedUserById(id);

    if (!updatedUser) {
      return res.status(404).json({ data: null, message: "User not found" });
    }

    res.json({
      data: updatedUser,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ data: null, message: "error" });
  }
};

// Delete a user
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const affectedRows = await User.destroy({
      where: { _id: id },
    });

    if (affectedRows === 0) {
      return res.status(404).json({ data: null, message: "User not found" });
    }
    res.json({ data: null, success: true });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
    console.error(error);
  }
};

// Update user role
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!["admin", "staff", "customer"].includes(role)) {
      return res.status(400).json({ data: null, message: "Invalid role" });
    }

    const [affectedRows] = await User.update({ role }, { where: { _id: id } });
    if (affectedRows === 0) {
      const userExists = await User.findByPk(id);
      if (!userExists) {
        return res.status(404).json({ data: null, message: "User not found" });
      }
    }
    res.json({ data: null, success: true });
  } catch (error) {
    res.status(500).json({ data: null, message: "error" });
    console.error(error);
  }
};
