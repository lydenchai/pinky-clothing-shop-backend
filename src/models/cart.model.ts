export interface CartItem {
  id?: number;
  userId: number;
  productId: number;
  quantity: number;
  size?: string;
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartItemWithProduct extends CartItem {
  productName: string;
  productPrice: number;
  productImage: string;
  productStock: number;
}
