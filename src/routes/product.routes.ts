import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", productController.getAllProducts);
router.get("/categories", productController.getCategories);
router.get("/find/:id", productController.getProductById);
router.post(
  "/create",
  authenticate,
  productController.productValidation,
  productController.createProduct
);
router.put("/update/:id", authenticate, productController.updateProduct);
router.delete("/delete/:id", authenticate, productController.deleteProduct);

export default router;
