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
  HasMany,
  AllowNull,
  Default,
} from "sequelize-typescript";
import { User } from "./User";
import { OrderItem } from "./OrderItem";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "orders",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Order extends Model {
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

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  total_amount!: number;

  @Default("pending")
  @Column(
    DataType.ENUM("pending", "processing", "shipped", "delivered", "cancelled"),
  )
  status!: "pending" | "processing" | "shipped" | "delivered" | "cancelled";

  @AllowNull(false)
  @Column(DataType.TEXT)
  address!: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;

  @HasMany(() => OrderItem)
  items!: OrderItem[];
}
