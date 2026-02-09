import { Product } from "../models/Product";

export interface Inventory {
  _id?: string;
  code?: string;
  product_id: string;
  quantity: number;
  location?: string;
  supplier?: string;
  expiry_date?: Date | null;
  low_stock_threshold?: number;
  low_stock_alerted?: boolean;
  created_at?: Date;
  updated_at?: Date;
  product?: Product;
}

export interface InventoryLog {
  _id?: string;
  inventory_id: string;
  action: "stock_in" | "stock_out" | "adjustment";
  amount: number;
  previous_quantity: number;
  new_quantity: number;
  created_at?: Date;
  note?: string;
}
