import { Address } from "./address";
import { RoleEnum } from "./enums/role.enum";

export interface User {
  id?: number;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
    is_active?: boolean;
    is_blocked?: boolean;
  address?: Address;
  phone?: string;
    role: RoleEnum;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserResponse {
  _id?: string;
  email: string;
  first_name: string;
  last_name: string;
  address?: Address;
  phone?: string;
  role?: RoleEnum;
  created_at?: Date;
  updated_at?: Date;
}
