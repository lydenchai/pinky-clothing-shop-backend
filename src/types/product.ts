import { Address } from "./address";
import { DiscountTypeEnum } from "./enums/discount-type.enum";

export interface Product {
  _id?: string;
  name: string;
  description: string;
  price: number;
  discount_type?: DiscountTypeEnum;
  discount_value?: number | null;
  discount_start?: Date | null;
  discount_end?: Date | null;
  category: string;
  subcategory?: string;
  image: string;
  stock: number;
  sizes?: string;
  colors?: string;
  address?: Address;
  created_at?: Date;
  updated_at?: Date;
}

export interface ProductFilter {
  category?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  in_stock?: boolean;
}
