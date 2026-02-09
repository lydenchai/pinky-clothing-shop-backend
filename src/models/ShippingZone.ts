import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "shipping_zones",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class ShippingZone extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @Column(DataType.STRING(100))
  name!: string;

  @Column(DataType.DECIMAL(10, 2))
  delivery_fee!: number;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;
}
