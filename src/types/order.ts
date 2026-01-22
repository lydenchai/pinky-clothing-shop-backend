import { Address } from "./address";

export interface Order {
  _id?: string;
  user_id?: string;
  total_amount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  address: Address;
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
