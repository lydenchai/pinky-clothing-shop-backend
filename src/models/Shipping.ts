import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  Default,
} from "sequelize-typescript";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "shippings",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Shipping extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @Column(DataType.STRING(20))
  code!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  name!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  description!: string;

  @AllowNull(false)
  @Column(DataType.FLOAT)
  price!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  min_order!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  max_order!: number;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  country!: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  estimated_days!: number;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  active!: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;
}
