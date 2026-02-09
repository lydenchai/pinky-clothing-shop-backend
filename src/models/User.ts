import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  Default,
  Unique,
  AllowNull,
} from "sequelize-typescript";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "users",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class User extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(255))
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  password!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  first_name!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  last_name!: string;

  @Column(DataType.TEXT)
  address!: string;

  @Column(DataType.STRING(20))
  phone!: string;

  @Default("customer")
  @Column(DataType.ENUM("admin", "customer"))
  role!: "admin" | "customer";

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;
}
