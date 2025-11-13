export interface Order {
  id?: number;
  userId: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItem {
  id?: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export interface OrderWithItems extends Order {
  items: Array<OrderItem & {
    productName: string;
    productImage: string;
  }>;
}
