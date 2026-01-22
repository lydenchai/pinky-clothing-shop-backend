export interface Product {
  _id?: string;
  name: string;
  description: string;
  price: number;
  discount?: number; // percentage discount, e.g. 20 for 20%
  category: string;
  subcategory?: string;
  image: string;
  stock: number;
  sizes?: string;
  colors?: string;
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
