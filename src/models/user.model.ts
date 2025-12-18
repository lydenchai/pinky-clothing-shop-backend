export interface User {
  id?: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  role?: "admin" | "customer";
  created_at?: Date;
  updated_at?: Date;
}

export interface UserResponse {
  _id?: string;
  email: string;
  first_name: string;
  last_name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  role?: "admin" | "customer";
  created_at?: Date;
  updated_at?: Date;
}
