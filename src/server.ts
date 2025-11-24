import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config";
import { testConnection } from "./config/database";
import { initializeDatabase } from "./config/init-db";
import { ensureAdminUser } from "./scripts/ensure-admin-user";
import { seed } from "./scripts/seed";

// Routes
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import userRoutes from "./routes/user.routes";

const app = express();

// Middleware
// Configure CORS to validate origin against an allow-list and to expose headers
const allowedOrigins = Array.isArray(config.cors.origin)
  ? config.cors.origin
  : [config.cors.origin];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // In development allow any origin to simplify local testing
      if (config.nodeEnv !== 'production') return callback(null, true);
      // Allow if origin is explicitly in the allow-list or allow-list contains '*'
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Origin not allowed'));
    },
    credentials: true,
    exposedHeaders: ['Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  next();
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    error:
      config.nodeEnv === "production" ? "Internal server error" : err.message,
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }

    // Initialize database tables
    await initializeDatabase();

    // In development, ensure an admin user exists automatically
    if (config.nodeEnv !== 'production') {
      try {
        await ensureAdminUser();
        console.log('Ensured admin user exists.');
      } catch (err) {
        console.error('Failed to ensure admin user:', err);
      }

      // Optionally run seed when RUN_SEED=true
      if (process.env.RUN_SEED === 'true') {
        try {
          console.log('RUN_SEED=true — running seed script...');
          await seed();
          console.log('Seed completed.');
        } catch (err) {
          console.error('Seeding failed:', err);
        }
      }
    }

    // Start listening
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════╗
║   Pinky Clothing Shop Backend Server       ║
╟────────────────────────────────────────────╢
║   🚀 Server running on port ${config.port}           ║
║   🌍 Environment: ${config.nodeEnv}              ║
║   📊 Database: ${config.database.database}         ║
║   🔗 CORS Origin: ${config.cors.origin}    ║
║                                            ║
║   📖 API Endpoints:                        ║
║   - GET  /health                           ║
║   - POST /api/auth/register                ║
║   - POST /api/auth/login                   ║
║   - GET  /api/auth/profile                 ║
║   - GET  /api/products                     ║
║   - GET  /api/cart                         ║
║   - GET  /api/orders                       ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();

export default app;
