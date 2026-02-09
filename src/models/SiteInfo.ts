import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
  PrimaryKey,
} from "sequelize-typescript";

@Table({
  tableName: "site_info",
  timestamps: false,
})
export class SiteInfo extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.STRING(255))
  name!: string;

  @Column(DataType.TEXT)
  description!: string;

  @Column(DataType.STRING(255))
  email!: string;

  @Column(DataType.STRING(50))
  phone!: string;

  @Column(DataType.TEXT("long"))
  store_logo!: string;

  @Column(DataType.TEXT("long"))
  favicon!: string;

  @Column(DataType.STRING(255))
  address!: string;

  @Column(DataType.STRING(255))
  facebook!: string;

  @Column(DataType.STRING(255))
  instagram!: string;

  @Column(DataType.STRING(255))
  tik_tok!: string;

  @Column(DataType.TEXT)
  meta_description!: string;
}
