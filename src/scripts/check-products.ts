import { pool } from "../config/database";

const checkProducts = async () => {
  try {
    const [rows] = await pool.query<any[]>(
      "SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category"
    );

    console.table(rows);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

checkProducts();
