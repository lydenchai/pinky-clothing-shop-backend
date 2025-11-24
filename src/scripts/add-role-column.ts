import { pool } from "../config/database";
import { ResultSetHeader } from "mysql2";

export const addRoleColumn = async () => {
  const connection = await pool.getConnection();

  try {
    // Check if column exists
    const [columns] = await connection.query<any[]>(
      "SHOW COLUMNS FROM users LIKE 'role'"
    );

    if (columns.length === 0) {
      console.log("Adding role column to users table...");
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN role ENUM('admin', 'customer') DEFAULT 'customer' AFTER phone
      `);
      console.log("Role column added successfully.");
    } else {
      console.log("Role column already exists.");
    }

    // Update pinky@example.com to admin
    console.log("Updating pinky@example.com to admin...");
    const [result] = await connection.query<ResultSetHeader>(
      "UPDATE users SET role = 'admin' WHERE email = 'pinky@example.com'"
    );

    if (result.affectedRows > 0) {
      console.log("User pinky@example.com updated to admin.");
    } else {
      console.log("User pinky@example.com not found.");
    }

  } catch (error) {
    console.error("Error updating database:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// Run if called directly
if (require.main === module) {
  addRoleColumn()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
