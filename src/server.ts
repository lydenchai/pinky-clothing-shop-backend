import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config";
import { testConnection } from "./config/database";
import { initializeDatabase } from "./config/init-db";

// Routes
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";

const app = express();

// Middleware
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
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
      console.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    // Initialize database tables
    await initializeDatabase();

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
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
