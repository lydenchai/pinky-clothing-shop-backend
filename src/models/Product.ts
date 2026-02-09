import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  Unique,
  HasMany,
  AllowNull,
  Default,
} from "sequelize-typescript";
import { CartItem } from "./CartItem";
import { OrderItem } from "./OrderItem";
import { Inventory } from "./Inventory";
import { Wishlist } from "./Wishlist";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "products",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Product extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @Unique
  @Column(DataType.STRING(20))
  code!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  name!: string;

  @Column(DataType.TEXT)
  description!: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  price!: number;

  @Column(DataType.ENUM("percentage", "fixed"))
  discount_type!: "percentage" | "fixed";

  @Column(DataType.DECIMAL(10, 2))
  discount_value!: number;

  @Column(DataType.DATE)
  discount_start!: Date;

  @Column(DataType.DATE)
  discount_end!: Date;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  category!: string;

  @Column(DataType.STRING(100))
  subcategory!: string;

  @Column(DataType.TEXT("long"))
  image!: string;

  @Default(0)
  @Column(DataType.INTEGER)
  stock!: number;

  @Column(DataType.STRING(255))
  sizes!: string;

  @Column(DataType.STRING(255))
  colors!: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;

  @HasMany(() => CartItem)
  cartItems!: CartItem[];

  @HasMany(() => OrderItem)
  orderItems!: OrderItem[];

  @HasMany(() => Inventory)
  inventory!: Inventory[];

  @HasMany(() => Wishlist)
  wishlist!: Wishlist[];
}
