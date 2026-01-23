export const DiscountTypeEnum = {
  percentage: "percentage",
  fixed: "fixed",
} as const;
export type DiscountTypeEnum = (typeof DiscountTypeEnum)[keyof typeof DiscountTypeEnum];