import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pinky_clothing_shop',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  cors: {
    // Allow a single origin or a comma-separated list via env var CORS_ORIGIN
    // Example: CORS_ORIGIN="http://localhost:4200,http://127.0.0.1:5173"
    origin: (process.env.CORS_ORIGIN || 'http://localhost:4200')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
};
