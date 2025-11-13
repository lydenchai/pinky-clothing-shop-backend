export interface User {
  id?: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
