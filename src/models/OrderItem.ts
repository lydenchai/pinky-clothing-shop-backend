import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
} from "sequelize-typescript";
import { Order } from "./Order";
import { Product } from "./Product";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "order_items",
  timestamps: false,
})
export class OrderItem extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @ForeignKey(() => Order)
  @AllowNull(false)
  @Column(DataType.STRING(36))
  order_id!: string;

  @BelongsTo(() => Order)
  order!: Order;

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column(DataType.STRING(36))
  product_id!: string;

  @BelongsTo(() => Product)
  product!: Product;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  quantity!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  price!: number;

  @Column(DataType.STRING(10))
  size!: string;

  @Column(DataType.STRING(50))
  color!: string;
}
