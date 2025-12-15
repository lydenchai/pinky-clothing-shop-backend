export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  sizes?: string;
  colors?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  inStock?: boolean;
}
