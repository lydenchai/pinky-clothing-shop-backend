export const RoleEnum = {
  admin: "admin",
  customer: "customer",
} as const;
export type RoleEnum = (typeof RoleEnum)[keyof typeof RoleEnum];
