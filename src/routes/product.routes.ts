import { Router } from "express";
import * as productController from "../controllers/product.controller";
import multer from "multer";

import { authenticate } from "../middleware/auth.middleware";
const router = Router();

// Configure multer for image uploads
import { Request } from "express";
const storage = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    cb(null, "uploads/");
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

router.get("/", productController.getAllProducts);
router.get("/categories", productController.getCategories);
router.get("/find/:id", productController.getProductById);
router.post(
  "/create",
  authenticate,
  upload.single("image"),
  productController.productValidation,
  productController.createProduct
);
router.patch(
  "/update/:id",
  authenticate,
  upload.single("image"),
  productController.updateProduct
);
router.delete("/delete/:id", authenticate, productController.deleteProduct);

export default router;
