# Pinky Clothing Shop - Backend

A comprehensive RESTful API for an e-commerce clothing shop built with Node.js, Express, TypeScript, and MySQL.

## Features

- 🔐 **Authentication & Authorization** - JWT-based user authentication
- 👤 **User Management** - User registration, login, and profile management
- 🛍️ **Product Management** - CRUD operations for products with filtering and search
- 🛒 **Shopping Cart** - Add, update, and remove items from cart
- 📦 **Order Management** - Checkout process and order history
- 🔍 **Advanced Filtering** - Filter products by category, price, and availability
- 💾 **MySQL Database** - Relational database with proper schema design

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MySQL** - Relational database
- **mysql2** - MySQL client for Node.js
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **express-validator** - Request validation
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

1. **Clone the repository**

   ```bash
   cd pinky-clothing-shop-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   copy .env.example .env
   ```

   Edit `.env` and configure your settings:

   ```env
   PORT=3000
   NODE_ENV=development

   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=pinky_clothing_shop

   JWT_SECRET=your_secret_key
   JWT_EXPIRES_IN=7d

   CORS_ORIGIN=http://localhost:4200
   ```

4. **Create MySQL database**

   ```sql
   CREATE DATABASE pinky_clothing_shop;
   ```

5. **Run the application**

   Development mode (with auto-reload):

   ```bash
   npm run dev
   ```

   Production mode:

   ```bash
   npm run build
   npm start
   ```

6. **To migrate tables into your databases**

   ```bash
   npx ts-node src/config/init-db.ts

   ```

7. **Seed the database** (optional)

   ```bash
   npm run seed
   ```

   This will create sample products and a demo user:

   - Email: `pinky@example.com`
   - Password: `password123`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)
- `PUT /api/auth/profile` - Update user profile (requires auth)

### Products

- `GET /api/products` - Get all products (supports filtering)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/categories` - Get all categories
- `POST /api/products` - Create product (requires auth)
- `PUT /api/products/:id` - Update product (requires auth)
- `DELETE /api/products/:id` - Delete product (requires auth)

### Cart

- `GET /api/cart` - Get user's cart (requires auth)
- `POST /api/cart` - Add item to cart (requires auth)
- `PUT /api/cart/:id` - Update cart item (requires auth)
- `DELETE /api/cart/:id` - Remove item from cart (requires auth)
- `DELETE /api/cart` - Clear cart (requires auth)

### Orders

- `POST /api/orders` - Create order from cart (requires auth)
- `GET /api/orders` - Get user's orders (requires auth)
- `GET /api/orders/:id` - Get order by ID (requires auth)
- `PUT /api/orders/:id/status` - Update order status (requires auth)

## Database Schema

### Users Table

- id, email, password, firstName, lastName
- address, city, postalCode, country, phone
- createdAt, updatedAt

### Products Table

- id, name, description, price, category
- imageUrl, stock, sizes, colors
- createdAt, updatedAt

### Cart Items Table

- id, userId, productId, quantity
- size, color
- createdAt, updatedAt

### Orders Table

- id, userId, totalAmount, status
- shippingAddress, shippingCity, shippingPostalCode, shippingCountry
- createdAt, updatedAt

### Order Items Table

- id, orderId, productId, quantity, price
- size, color

## Project Structure

```
src/
├── config/
│   ├── index.ts          # Configuration management
│   ├── database.ts       # MySQL connection pool
│   └── init-db.ts        # Database initialization
├── controllers/
│   ├── auth.controller.ts
│   ├── product.controller.ts
│   ├── cart.controller.ts
│   └── order.controller.ts
├── middleware/
│   └── auth.middleware.ts
├── models/
│   ├── user.model.ts
│   ├── product.model.ts
│   ├── cart.model.ts
│   └── order.model.ts
├── routes/
│   ├── auth.routes.ts
│   ├── product.routes.ts
│   ├── cart.routes.ts
│   └── order.routes.ts
├── scripts/
│   └── seed.ts           # Database seeding script
└── server.ts             # Application entry point
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# To migrate tables into your database
npx ts-node src/config/init-db.ts

# Seed database
npm run seed
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- Input validation using express-validator
- CORS protection
- SQL injection prevention using parameterized queries

## License

ISC
