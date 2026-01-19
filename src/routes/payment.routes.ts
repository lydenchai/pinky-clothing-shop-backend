import { Router } from "express";

import dotenv from "dotenv";

dotenv.config();

const router = Router();
// Create a PaymentIntent
router.post("/create-payment-intent", async (req, res) => {
  try {
    // Add payment intent creation logic here
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
