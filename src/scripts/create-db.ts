import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function createDatabase() {
  try {
    // Connect without database specified
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
    });

    // Create database
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${
        process.env.DB_NAME || "pinky_clothing_shop"
      }`
    );

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating database:", error);
    process.exit(1);
  }
}

createDatabase();
