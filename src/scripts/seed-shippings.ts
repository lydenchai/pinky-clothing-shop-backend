import { pool } from "../config/database";

async function seedShippings() {
  const shippings = [
    {
      name: "Standard Shipping",
      description: "Delivery within 5-7 business days.",
      price: 5.99,
      min_order: 0,
      max_order: 100,
      country: "US",
      estimated_days: 7,
      active: true,
    },
    {
      name: "Express Shipping",
      description: "Delivery within 2-3 business days.",
      price: 14.99,
      min_order: 0,
      max_order: 50,
      country: "US",
      estimated_days: 3,
      active: true,
    },
    {
      name: "International Shipping",
      description: "Delivery within 7-14 business days.",
      price: 24.99,
      min_order: 0,
      max_order: 20,
      country: "ALL",
      estimated_days: 14,
      active: true,
    },
  ];

  for (const shipping of shippings) {
    await pool.query("INSERT INTO shippings SET ?", [shipping]);
  }
  console.log("Seeded shippings table.");
}

if (require.main === module) {
  seedShippings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
