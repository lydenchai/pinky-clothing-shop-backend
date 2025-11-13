import { pool } from "../config/database";

const clearProducts = async () => {
  try {
    await pool.query("DELETE FROM products");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

clearProducts();
