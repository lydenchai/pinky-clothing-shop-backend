import { pool } from "../config/database";
import bcrypt from "bcryptjs";
import { RowDataPacket } from "mysql2";

const checkUser = async () => {
  try {
    const email = "pinky@example.com";
    const password = "password123";

    console.log(`Checking user: ${email}`);

    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      console.log("User not found in database.");
    } else {
      const user = users[0];
      console.log("User found:", {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
      });

      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Password '${password}' match: ${isMatch}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking user:", error);
    process.exit(1);
  }
};

checkUser();
