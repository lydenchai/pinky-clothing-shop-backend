import { sequelize } from "../config/sequelize";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { Inventory } from "../models/Inventory";
import { SiteInfo } from "../models/SiteInfo";
import bcrypt from "bcryptjs";
import { generateCode } from "../utils/code.util";
import { generateObjectId } from "../utils/objectid.util";
import { Op } from "sequelize";

// Product templates for generating realistic products
const productTemplates = {
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
};

const colors = {
  Jeans: "Blue,Black,Gray,Light Blue,Dark Blue",
  Dresses: "Black,White,Red,Blue,Pink,Yellow,Green,Floral",
  Jackets: "Black,Brown,Navy,Gray,Tan,Olive",
  Shoes: "Black,White,Brown,Tan,Navy,Red,Gray",
  Sweaters: "Navy,Gray,Black,Burgundy,Cream,Camel,Green",
  Shorts: "Khaki,Navy,Black,Gray,Olive,Beige",
  Shirts: "White,Blue,Pink,Gray,Navy,Black,Green",
};

const sizes = {
  Jeans: "26,28,30,32,34,36,38,40",
  Dresses: "XS,S,M,L,XL,XXL",
  Jackets: "XS,S,M,L,XL,XXL",
  Shoes: "5,6,7,8,9,10,11,12",
  Sweaters: "XS,S,M,L,XL,XXL",
  Shorts: "XS,S,M,L,XL,XXL",
  Shirts: "XS,S,M,L,XL,XXL",
};

const images = {
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
      const price = Number.parseFloat((Math.random() * 150 + 20).toFixed(2)); // Random price between $20-$170
      const stock = Math.floor(Math.random() * 80) + 10; // Random stock between 10-90

      // Assign a unique image for each product by cycling through the image array
      const imagesArr = images[productType];
      const image = Array.isArray(imagesArr)
        ? imagesArr[i % imagesArr.length]
        : imagesArr;
      products.push({
        name: `${adjective} ${template.name}`,
        description: `${description} - ${demographic.charAt(0).toUpperCase() + demographic.slice(1)
          }'s ${productType}`,
        price: price,
        category: demographic,
        subcategory: productType,
        image: image,
        stock: stock,
        sizes: sizes[productType].split(","),
        colors: colors[productType].split(","),
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
    address: {
      street: "Main Street",
      house: "123",
      village: "Old Market Area",
      commune: "Boeng Keng Kang",
      district: "Chamkar Mon",
      province: "Phnom Penh",
      country: "Cambodia",
    },
    phone: "+85512345678",
    role: "admin",
  },
  {
    _id: generateObjectId(),
    email: "lyden@example.com",
    password: "password123",
    first_name: "Lyden",
    last_name: "Chai",
    address: {
      street: "Main Street",
      house: "123",
      village: "Old Market Area",
      commune: "Boeng Keng Kang",
      district: "Chamkar Mon",
      province: "Phnom Penh",
      country: "Cambodia",
    },
    phone: "+85512345678",
    role: "customer",
  },
  {
    _id: generateObjectId(),
    email: "lusi@example.com",
    password: "password123",
    first_name: "Lusi",
    last_name: "Zhao",
    address: {
      street: "Main Street",
      house: "123",
      village: "Old Market Area",
      commune: "Boeng Keng Kang",
      district: "Chamkar Mon",
      province: "Phnom Penh",
      country: "Cambodia",
    },
    phone: "+85512345678",
    role: "customer",
  },
];

async function seedUsersFn() {
  for (const user of seedUsers) {
    const existing = await User.findOne({ where: { email: user.email } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await User.create({
        ...user,
        password: hashedPassword,
        address: JSON.stringify(user.address),
      } as any);
    }
  }
}

async function seedOrdersFn() {
  // Fetch all user IDs and product IDs
  const users = await User.findAll({ attributes: ["_id", "email"] });
  const products = await Product.findAll({ attributes: ["_id", "price"] });

  if (users.length && products.length) {
    const orderStatuses = [
      "pending",
      "delivered",
      "cancelled",
    ];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      // Pick 1-3 products per order (always at least 1)
      const numProducts = Math.max(1, Math.floor(Math.random() * 3) + 1);
      const orderItemsData = [];
      let total = 0;

      for (let j = 0; j < numProducts; j++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        orderItemsData.push({
          product_id: prod._id,
          quantity,
          price: prod.price,
        });
        total += prod.price * quantity;
      }
      total = Number.parseFloat(total.toFixed(2));
      const status =
        orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const created_at = new Date(today.getTime() - i * 24 * 60 * 60 * 1000); // spread over last 30 days
      const orderCode = generateCode(i, "O");

      // Mock address, using fixed data as in original script
      const addressObj = {
        street: "Main St",
        house: "123",
        village: "Old Market Area",
        commune: "Boeng Keng Kang",
        district: "Chamkar Mon",
        province: "Phnom Penh",
        country: "Cambodia",
      };

      const order = await Order.create({
        code: orderCode,
        user_id: user._id,
        total_amount: total,
        status: status,
        address: JSON.stringify(addressObj),
        created_at: created_at,
      } as any);

      // Insert order items
      for (const item of orderItemsData) {
        await OrderItem.create({
          order_id: order._id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        } as any);
      }
    }
    console.log("Sample orders seeded.");
  }
}

export const seed = async () => {
  try {
    console.log("Starting seed process...");
    await sequelize.authenticate();
    // Ensure tables are created/updated from models
    await sequelize.sync({ alter: true });

    // Generate products
    const seedProducts = generateProducts(100);
    console.log(`Generated ${seedProducts.length} products.`);

    // Seed users
    await seedUsersFn();
    console.log("Users seeded.");

    const lastProduct = await Product.findOne({
      where: { code: { [Op.like]: "P%" } },
      order: [["code", "DESC"]],
      attributes: ["code"],
    });

    let lastNumber = 0;
    if (lastProduct) {
      const match = /^P\d{2}(\d{3})$/.exec(lastProduct.code);
      if (match) {
        lastNumber = Number.parseInt(match[1], 10);
      }
    }

    for (let i = 0; i < seedProducts.length; i++) {
      const product = seedProducts[i];
      const code = generateCode(lastNumber + i, "P");

      const existingProduct = await Product.findOne({ where: { code } });
      if (!existingProduct) {
        await Product.create({
          code,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          subcategory: product.subcategory,
          image: product.image,
          stock: product.stock,
          sizes: JSON.stringify(product.sizes),
          colors: JSON.stringify(product.colors),
        } as any);
      }
    }
    console.log("Products seeded.");

    // Seed inventory for each product
    const allProducts = await Product.findAll({ attributes: ["_id"] });
    for (let i = 0; i < allProducts.length; i++) {
      const invCode = generateCode(i, "I");
      const productId = allProducts[i]._id;
      const quantity = Math.floor(Math.random() * 50) + 1;
      const location = `Warehouse ${(i % 3) + 1}`;

      const existingInv = await Inventory.findOne({ where: { code: invCode } });
      if (!existingInv) {
        await Inventory.create({
          code: invCode,
          product_id: productId,
          quantity: quantity,
          location: location
        } as any);
      }
    }
    console.log("Inventory seeded.");

    // Seed site_info
    const siteData = {
      name: 'Pinky Clothing Shop',
      description: 'A modern clothing shop for all your fashion needs.',
      email: 'info@pinkyshop.com',
      phone: '+855 12 345 678',
      store_logo: '/imgs/logo.png',
      favicon: '/imgs/favicon.png',
      address: '123 Fashion St, Phnom Penh, Cambodia',
      facebook: 'https://facebook.com/pinkyshop',
      instagram: 'https://instagram.com/pinkyshop',
      tik_tok: 'https://tiktok.com/@pinkyshop',
      meta_description: 'Best fashion shop in Cambodia'
    };

    const siteInfo = await SiteInfo.findOne({ where: { name: siteData.name } });
    if (siteInfo) {
      await siteInfo.update(siteData);
    } else {
      await SiteInfo.create(siteData as any);
    }
    console.log("Site info seeded.");

    // Seed sample orders
    await seedOrdersFn();

  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  void (async () => {
    try {
      await seed();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}
