import {
  Model,
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  ForeignKey,
} from "sequelize-typescript";
import { Inventory } from "./Inventory";

@Table({
  tableName: "inventory_logs",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
})
export class InventoryLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING(36))
  _id!: string;

  @ForeignKey(() => Inventory)
  @Column(DataType.STRING(24))
  inventory_id!: string;

  @Column(DataType.ENUM("stock_in", "stock_out", "adjustment"))
  action!: "stock_in" | "stock_out" | "adjustment";

  @Column(DataType.INTEGER)
  amount!: number;

  @Column(DataType.INTEGER)
  previous_quantity!: number;

  @Column(DataType.INTEGER)
  new_quantity!: number;

  @Column(DataType.STRING(255))
  note!: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;
}
