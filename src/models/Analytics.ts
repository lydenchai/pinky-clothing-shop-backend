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
  AllowNull,
  Default,
} from "sequelize-typescript";
import { User } from "./User";

import { generateObjectId } from "../utils/objectid.util";

@Table({
  tableName: "analytics",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Analytics extends Model {
  @PrimaryKey
  @Default(generateObjectId)
  @Column(DataType.STRING(24))
  _id!: string;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  type!: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING(36))
  user_id!: string | null;

  @BelongsTo(() => User)
  user!: User;

  @Column(DataType.JSON)
  data!: any;

  @CreatedAt
  @Column(DataType.DATE)
  created_at!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updated_at!: Date;
}
