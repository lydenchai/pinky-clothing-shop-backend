import { pool } from "../config/database";

const test = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Connected to database!");
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("Failed to connect:", error);
    process.exit(1);
  }
};

test();
