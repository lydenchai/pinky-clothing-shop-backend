export interface ShippingMethod {
  _id: string;
  name: string;
  description: string;
  price: number;
  min_order: number;
  max_order: number;
  country: string;
  estimated_days: number;
  active: boolean;
}
