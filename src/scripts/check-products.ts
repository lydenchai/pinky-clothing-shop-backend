import { pool } from "../config/database";

const checkProducts = async () => {
  try {
    const [rows] = await pool.query<any[]>(
      "SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category"
    );
    await pool.end();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
};

checkProducts();
