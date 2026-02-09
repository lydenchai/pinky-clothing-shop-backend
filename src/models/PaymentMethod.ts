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
  tableName: "payment_methods",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class PaymentMethod extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @Column(DataType.STRING(50))
  name!: string;

  @Column(DataType.BOOLEAN)
  enabled!: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;
}
