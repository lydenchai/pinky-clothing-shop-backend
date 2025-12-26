export interface CartItem {
  _id?: string;
  user_id?: string;
  product_id: string;
  quantity: number;
  size?: string;
  color?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CartItemWithProduct extends CartItem {
  product_name: string;
  product_price: number;
  product_image: string;
  product_stock: number;
}
