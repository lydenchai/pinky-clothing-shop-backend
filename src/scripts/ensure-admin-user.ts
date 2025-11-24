import { pool } from "../config/database";
import bcrypt from "bcryptjs";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export const ensureAdminUser = async () => {
  const connection = await pool.getConnection();
  try {
    const email = "pinky@example.com";
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Ensuring user ${email} exists and is admin...`);

    // Check if user exists
    const [users] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      console.log("User not found. Creating...");
      await connection.query<ResultSetHeader>(
        `INSERT INTO users (email, password, firstName, lastName, role, address, city, country, phone)
         VALUES (?, ?, 'Pinky', 'Princess', 'admin', '123 Main St', 'Phnom Penh', 'Cambodia', '+85512345678')`,
        [email, hashedPassword]
      );
      console.log("User created successfully.");
    } else {
      console.log("User found. Updating password and role...");
      await connection.query<ResultSetHeader>(
        "UPDATE users SET password = ?, role = 'admin' WHERE email = ?",
        [hashedPassword, email]
      );
      console.log("User updated successfully.");
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// If executed directly, run and exit
if (require.main === module) {
  ensureAdminUser()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
