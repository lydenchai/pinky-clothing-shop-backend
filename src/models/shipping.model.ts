export interface ShippingAttributes {
  id: number;
  name: string;
  description: string;
  price: number;
  min_order: number;
  max: number;
  country: string;
  estimated_days: number;
  active: boolean;
}
