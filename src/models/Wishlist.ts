import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
} from "sequelize-typescript";
import { User } from "./User";
import { Product } from "./Product";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "wishlist",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
})
export class Wishlist extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

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

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;
}
