import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
  CreatedAt,
} from "sequelize-typescript";
import { Product } from "./Product";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "inventory",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Inventory extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @Column(DataType.STRING(20))
  code!: string;

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column(DataType.STRING(36))
  product_id!: string;

  @BelongsTo(() => Product)
  product!: Product;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  quantity!: number;

  @Column(DataType.STRING(255))
  location!: string;

  @Column(DataType.STRING(100))
  supplier!: string;

  @Column(DataType.DATE)
  expiry_date!: Date | null;

  @Default(5)
  @Column(DataType.INTEGER)
  low_stock_threshold!: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  low_stock_alerted!: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;
}
