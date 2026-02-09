import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from "sequelize-typescript";
import { Product } from "./Product";
import { ProductCategory } from "./ProductCategory";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "categories",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Category extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @Column(DataType.STRING(100))
  name!: string;

  @Column(DataType.STRING(255))
  description?: string;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;

  @BelongsToMany(() => Product, () => ProductCategory)
  products!: Product[];
}
