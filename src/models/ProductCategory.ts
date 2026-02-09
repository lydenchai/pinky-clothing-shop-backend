import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  PrimaryKey,
  Default,
} from "sequelize-typescript";
import { Product } from "./Product";
import { Category } from "./Category";
import { generateObjectId } from "../utils/objectid.util";

@Table({ tableName: "product_categories", timestamps: false })
export class ProductCategory extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(36))
  _id!: string;

  @ForeignKey(() => Product)
  @Column(DataType.STRING(36))
  product_id!: string;

  @ForeignKey(() => Category)
  @Column(DataType.STRING(36))
  category_id!: string;
}
