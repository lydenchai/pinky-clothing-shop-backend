export interface Order {
  _id?: string;
  user_id?: string;
  total_amount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface OrderItem {
  _id?: string;
  order_id?: string;
  product_id?: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export interface OrderWithItems extends Order {
  items: Array<
    OrderItem & {
      product_name: string;
      product_image: string;
    }
  >;
}
