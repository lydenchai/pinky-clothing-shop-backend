import { Router, Request } from "express";
import * as productController from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";
import multer from "multer";

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) {
    cb(null, "uploads/");
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Public product routes
router.get("/", productController.getAllProducts);

// Get products by category or subcategory
router.get("/categories", productController.getCategories);

// Get products by category or subcategory
router.get("/subcategories", productController.getSubcategories);

// Get product by ID
router.get("/find/:id", productController.getProductById);

// Admin-only product management routes
router.post( "/create", authenticate, upload.single("image"), productController.productValidation, productController.createProduct );

// Update product details
router.patch( "/update/:id", authenticate, upload.single("image"), productController.updateProduct );

// Delete a product
router.delete("/delete/:id", authenticate, productController.deleteProduct);

// Bulk set discount for multiple products (admin only)
router.post("/bulk-discount", authenticate, productController.bulkSetDiscount);

export default router;
