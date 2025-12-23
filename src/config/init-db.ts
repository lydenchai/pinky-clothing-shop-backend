import { pool } from "../config/database";

export const initializeDatabase = async () => {
  const connection = await pool.getConnection();

  try {
    /* =======================
       PRODUCTS IMAGE COLUMN
    ======================== */
    const [imageCols] = await connection.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'products'
         AND COLUMN_NAME = 'imageUrl'`
    );

    if ((imageCols as any[]).length > 0) {
      await connection.query(
        `ALTER TABLE products CHANGE COLUMN imageUrl image TEXT`
      );
    }

    /* =======================
       USERS
    ======================== */
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        _id VARCHAR(36) NOT NULL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        phone VARCHAR(20),
        role ENUM('admin','customer') DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    /* =======================
       PRODUCTS
    ======================== */
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        _id VARCHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image LONGTEXT,
        stock INT DEFAULT 0,
        sizes VARCHAR(255),
        colors VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_price (price)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    /* =======================
       CART ITEMS
    ======================== */
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        _id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        size VARCHAR(10),
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_cart_item (user_id, product_id, size, color),
        FOREIGN KEY (user_id) REFERENCES users(_id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(_id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    /* =======================
       ORDERS
    ======================== */
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        _id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
        shipping_address TEXT NOT NULL,
        shipping_city VARCHAR(100) NOT NULL,
        shipping_postal_code VARCHAR(20) NOT NULL,
        shipping_country VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(_id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    /* =======================
       ORDER ITEMS
    ======================== */
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        _id VARCHAR(36) NOT NULL PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        size VARCHAR(10),
        color VARCHAR(50),
        FOREIGN KEY (order_id) REFERENCES orders(_id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(_id),
        INDEX idx_order_id (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    /* =======================
       INVENTORY
    ======================== */
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        _id VARCHAR(36) NOT NULL PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        location VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(_id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    /* =======================
       ANALYTICS (ONLY ONCE)
    ======================== */
    await connection.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        _id VARCHAR(36) NOT NULL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        user_id VARCHAR(36),
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } finally {
    connection.release();
  }
};

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database initialized");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
