import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
} from "sequelize-typescript";
import { User } from "./User";
import { Product } from "./Product";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "cart_items",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class CartItem extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @Column(DataType.STRING(20))
  code!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING(36))
  user_id!: string;

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column(DataType.STRING(36))
  product_id!: string;

  @BelongsTo(() => Product)
  product!: Product;

  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  quantity!: number;

  @Column(DataType.STRING(10))
  size!: string;

  @Column(DataType.STRING(50))
  color!: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;
}
