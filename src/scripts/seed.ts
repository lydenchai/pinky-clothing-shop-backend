import { pool } from "../config/database";
import bcrypt from "bcryptjs";
import { ResultSetHeader } from "mysql2";
import crypto from "crypto";

export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = crypto.randomBytes(8).toString("hex");
  return timestamp + random; // 24 chars
}

// Product templates for generating realistic products
const productTemplates = {
  "T-Shirts": [
    {
      name: "Classic",
      adjectives: ["Cotton", "Premium", "Vintage", "Organic", "Soft"],
    },
    {
      name: "Graphic",
      adjectives: ["Artistic", "Retro", "Modern", "Abstract", "Minimalist"],
    },
    {
      name: "V-Neck",
      adjectives: ["Elegant", "Casual", "Fitted", "Relaxed", "Stylish"],
    },
    {
      name: "Henley",
      adjectives: ["Classic", "Button", "Textured", "Ribbed", "Layered"],
    },
    {
      name: "Pocket",
      adjectives: ["Casual", "Utility", "Simple", "Functional", "Basic"],
    },
  ],
  Jeans: [
    {
      name: "Slim Fit",
      adjectives: ["Stretch", "Dark Wash", "Light Wash", "Black", "Distressed"],
    },
    {
      name: "Straight Leg",
      adjectives: ["Classic", "Rigid", "Vintage", "Comfort", "Original"],
    },
    {
      name: "Skinny",
      adjectives: ["Ultra Stretch", "Ripped", "Black", "Blue", "High Rise"],
    },
    {
      name: "Bootcut",
      adjectives: ["Flared", "Mid Rise", "Classic", "Western", "Retro"],
    },
    {
      name: "Relaxed Fit",
      adjectives: ["Comfortable", "Loose", "Casual", "Easy", "Carpenter"],
    },
  ],
  Dresses: [
    {
      name: "Maxi",
      adjectives: ["Floral", "Bohemian", "Elegant", "Summer", "Beach"],
    },
    {
      name: "Midi",
      adjectives: ["A-Line", "Wrap", "Fitted", "Pleated", "Casual"],
    },
    {
      name: "Mini",
      adjectives: ["Party", "Cocktail", "Casual", "Skater", "Bodycon"],
    },
    {
      name: "Shift",
      adjectives: ["Classic", "Simple", "Modern", "Minimalist", "Elegant"],
    },
    {
      name: "Sundress",
      adjectives: ["Flowy", "Strappy", "Cotton", "Breezy", "Colorful"],
    },
  ],
  Jackets: [
    {
      name: "Leather",
      adjectives: ["Biker", "Classic", "Vintage", "Moto", "Bomber"],
    },
    {
      name: "Denim",
      adjectives: ["Vintage", "Oversized", "Cropped", "Distressed", "Classic"],
    },
    {
      name: "Blazer",
      adjectives: [
        "Formal",
        "Casual",
        "Double Breasted",
        "Slim Fit",
        "Structured",
      ],
    },
    {
      name: "Puffer",
      adjectives: ["Quilted", "Hooded", "Lightweight", "Oversized", "Cropped"],
    },
    {
      name: "Windbreaker",
      adjectives: ["Sporty", "Waterproof", "Packable", "Hooded", "Zip-Up"],
    },
  ],
  Shoes: [
    {
      name: "Sneakers",
      adjectives: ["Running", "Casual", "High-Top", "Low-Top", "Canvas"],
    },
    {
      name: "Boots",
      adjectives: ["Ankle", "Chelsea", "Combat", "Work", "Hiking"],
    },
    {
      name: "Loafers",
      adjectives: ["Leather", "Suede", "Classic", "Penny", "Driving"],
    },
    {
      name: "Sandals",
      adjectives: ["Slide", "Sport", "Leather", "Strappy", "Flip-Flop"],
    },
    {
      name: "Heels",
      adjectives: ["Stiletto", "Block", "Wedge", "Kitten", "Platform"],
    },
  ],
  Sweaters: [
    {
      name: "Crewneck",
      adjectives: ["Wool", "Cashmere", "Cotton", "Cable Knit", "Ribbed"],
    },
    {
      name: "Cardigan",
      adjectives: [
        "Button-Up",
        "Open Front",
        "Longline",
        "Chunky",
        "Lightweight",
      ],
    },
    {
      name: "Turtleneck",
      adjectives: ["Fitted", "Oversized", "Ribbed", "Merino", "Cashmere"],
    },
    {
      name: "Hoodie",
      adjectives: ["Zip-Up", "Pullover", "Fleece", "Oversized", "Cropped"],
    },
    {
      name: "V-Neck",
      adjectives: ["Classic", "Lightweight", "Merino", "Fine Knit", "Layering"],
    },
  ],
  Shorts: [
    {
      name: "Chino",
      adjectives: ["Casual", "Flat Front", "Pleated", "Stretch", "Classic"],
    },
    {
      name: "Denim",
      adjectives: [
        "Distressed",
        "Cuffed",
        "High-Waisted",
        "Boyfriend",
        "Frayed",
      ],
    },
    {
      name: "Athletic",
      adjectives: [
        "Running",
        "Basketball",
        "Training",
        "Moisture-Wicking",
        "Mesh",
      ],
    },
    {
      name: "Cargo",
      adjectives: ["Utility", "Multi-Pocket", "Tactical", "Relaxed", "Cotton"],
    },
    {
      name: "Board",
      adjectives: ["Swim", "Quick-Dry", "Printed", "Surf", "Beach"],
    },
  ],
  Shirts: [
    {
      name: "Oxford",
      adjectives: [
        "Button-Down",
        "Classic",
        "Wrinkle-Free",
        "Slim Fit",
        "Regular Fit",
      ],
    },
    {
      name: "Flannel",
      adjectives: ["Plaid", "Checkered", "Soft", "Brushed", "Casual"],
    },
    {
      name: "Polo",
      adjectives: [
        "Pique",
        "Striped",
        "Classic Fit",
        "Slim Fit",
        "Performance",
      ],
    },
    {
      name: "Linen",
      adjectives: ["Lightweight", "Breezy", "Summer", "Casual", "Relaxed"],
    },
    {
      name: "Chambray",
      adjectives: ["Denim-Like", "Casual", "Lightweight", "Western", "Classic"],
    },
  ],
  Activewear: [
    {
      name: "Leggings",
      adjectives: [
        "High-Waisted",
        "Compression",
        "Mesh Panel",
        "Seamless",
        "Capri",
      ],
    },
    {
      name: "Sports Bra",
      adjectives: [
        "High-Impact",
        "Medium-Impact",
        "Strappy",
        "Racerback",
        "Wireless",
      ],
    },
    {
      name: "Tank Top",
      adjectives: ["Muscle", "Racerback", "Loose Fit", "Fitted", "Mesh"],
    },
    {
      name: "Track Pants",
      adjectives: ["Tapered", "Jogger", "Zip Ankle", "Relaxed", "Sweatpants"],
    },
    {
      name: "Performance Tee",
      adjectives: [
        "Moisture-Wicking",
        "Breathable",
        "Seamless",
        "Quick-Dry",
        "Anti-Odor",
      ],
    },
  ],
};

const colors = {
  "T-Shirts": "White,Black,Gray,Navy,Red,Blue,Green,Yellow",
  Jeans: "Blue,Black,Gray,Light Blue,Dark Blue",
  Dresses: "Black,White,Red,Blue,Pink,Yellow,Green,Floral",
  Jackets: "Black,Brown,Navy,Gray,Tan,Olive",
  Shoes: "Black,White,Brown,Tan,Navy,Red,Gray",
  Sweaters: "Navy,Gray,Black,Burgundy,Cream,Camel,Green",
  Shorts: "Khaki,Navy,Black,Gray,Olive,Beige",
  Shirts: "White,Blue,Pink,Gray,Navy,Black,Green",
  Activewear: "Black,Navy,Gray,Purple,Pink,Blue,Red",
};

const sizes = {
  "T-Shirts": "XS,S,M,L,XL,XXL",
  Jeans: "26,28,30,32,34,36,38,40",
  Dresses: "XS,S,M,L,XL,XXL",
  Jackets: "XS,S,M,L,XL,XXL",
  Shoes: "5,6,7,8,9,10,11,12",
  Sweaters: "XS,S,M,L,XL,XXL",
  Shorts: "XS,S,M,L,XL,XXL",
  Shirts: "XS,S,M,L,XL,XXL",
  Activewear: "XS,S,M,L,XL,XXL",
};

const images = {
  "T-Shirts": [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800",
  ],
  Jeans: [
    "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
  ],
  Dresses: [
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800",
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800",
  ],
  Jackets: [
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
  ],
  Shoes: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
  ],
  Sweaters: [
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800",
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
  ],
  Shorts: [
    "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
  ],
  Shirts: [
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
  ],
  Activewear: [
    "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800",
    "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800",
  ],
};

const descriptions = [
  "Perfect for everyday wear with ultimate comfort",
  "Premium quality materials and expert craftsmanship",
  "Designed for style and durability",
  "A versatile addition to your wardrobe",
  "Contemporary design meets classic appeal",
  "Exceptional comfort and modern fit",
  "Timeless style that never goes out of fashion",
  "Crafted with attention to every detail",
  "Elevate your style with this essential piece",
  "Comfort and style in perfect harmony",
  "Designed for the modern lifestyle",
  "Experience the perfect blend of style and comfort",
  "Made with high-quality sustainable materials",
  "The perfect choice for any occasion",
  "Upgrade your wardrobe with this essential item",
];

function generateProducts(count: number = 100) {
  const products = [];
  const productTypes = Object.keys(productTemplates) as Array<
    keyof typeof productTemplates
  >;
  const demographics = ["women", "men", "kids"];
  const productsPerDemographic = Math.floor(count / demographics.length);

  for (let demoIndex = 0; demoIndex < demographics.length; demoIndex++) {
    const demographic = demographics[demoIndex];
    const numProducts =
      productsPerDemographic +
      (demoIndex === 0 ? count % demographics.length : 0);

    for (let i = 0; i < numProducts; i++) {
      // Cycle through product types
      const productType = productTypes[i % productTypes.length];
      const templates = productTemplates[productType];
      const template = templates[i % templates.length];
      const adjective =
        template.adjectives[
          Math.floor(Math.random() * template.adjectives.length)
        ];
      const description =
        descriptions[Math.floor(Math.random() * descriptions.length)];
      const price = parseFloat((Math.random() * 150 + 20).toFixed(2)); // Random price between $20-$170
      const stock = Math.floor(Math.random() * 80) + 10; // Random stock between 10-90

      // Assign a unique image for each product by cycling through the image array
      const imagesArr = images[productType];
      const image = Array.isArray(imagesArr)
        ? imagesArr[i % imagesArr.length]
        : imagesArr;
      products.push({
        name: `${adjective} ${template.name}`,
        description: `${description} - ${
          demographic.charAt(0).toUpperCase() + demographic.slice(1)
        }'s ${productType}`,
        price: price,
        category: demographic,
        image: image,
        stock: stock,
        sizes: sizes[productType],
        colors: colors[productType],
      });
    }
  }

  return products;
}

const seedUsers = [
  {
    _id: generateObjectId(),
    email: "pinky@example.com",
    password: "password123",
    first_name: "Pinky",
    last_name: "Princess",
    address: "123 Main Street",
    city: "Phnom Penh",
    postal_code: "12000",
    country: "Cambodia",
    phone: "+85512345678",
    role: "admin",
  },
];

export const seed = async () => {
  const connection = await pool.getConnection();

  try {
    console.log("Starting seed process...");

    // Generate products
    const seedProducts = generateProducts(100);
    console.log(`Generated ${seedProducts.length} products.`);

    // Seed users
    for (const user of seedUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await connection.query<ResultSetHeader>(
        `INSERT INTO users (_id, email, password, first_name, last_name, address, city, postal_code, country, phone, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = email`,
        [
          user._id,
          user.email,
          hashedPassword,
          user.first_name,
          user.last_name,
          user.address,
          user.city,
          user.postal_code,
          user.country,
          user.phone,
          user.role,
        ]
      );
    }
    console.log("Users seeded.");
    for (const product of seedProducts) {
      await connection.query<ResultSetHeader>(
        `INSERT INTO products (_id, name, description, price, category, image, stock, sizes, colors)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateObjectId(),
          product.name,
          product.description,
          product.price,
          product.category,
          product.image,
          product.stock,
          product.sizes,
          product.colors,
        ]
      );
    }
    console.log("Products seeded.");

    // Seed sample orders
    // Fetch all user IDs and product IDs
    const [userRows] = await connection.query<any[]>(`SELECT _id FROM users`);
    const [productRows] = await connection.query<any[]>(`SELECT _id, price FROM products`);
    if (userRows.length && productRows.length) {
      const orderStatuses = ["pending", "delivered", "cancelled"];
      const today = new Date();
      for (let i = 0; i < 30; i++) { // 30 orders, one per day
        const user = userRows[Math.floor(Math.random() * userRows.length)];
        // Pick 1-3 products per order
        const numProducts = Math.floor(Math.random() * 3) + 1;
        const products = [];
        let total = 0;
        for (let j = 0; j < numProducts; j++) {
          const prod = productRows[Math.floor(Math.random() * productRows.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          products.push({ product_id: prod._id, quantity, price: prod.price });
          total += prod.price * quantity;
        }
        total = parseFloat(total.toFixed(2));
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        const created_at = new Date(today.getTime() - i * 24 * 60 * 60 * 1000); // spread over last 30 days
        // Use total_amount and add required shipping fields
        await connection.query<ResultSetHeader>(
          `INSERT INTO orders (_id, user_id, total_amount, status, shipping_address, shipping_city, shipping_postal_code, shipping_country, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateObjectId(),
            user._id,
            total,
            status,
            user.address || '123 Main St',
            user.city || 'Phnom Penh',
            user.postal_code || '12000',
            user.country || 'Cambodia',
            created_at
          ]
        );
        // Optionally, insert order items if you have an order_items table
      }
      console.log("Sample orders seeded.");
    }
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
