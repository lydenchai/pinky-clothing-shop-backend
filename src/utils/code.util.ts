/**
 * Generate a code in the format [prefix]YYNNN (e.g., P26001 for product, O26001 for order, etc.)
 * @param lastNumberToday The last number for today
 * @param prefix The code prefix (e.g., 'P' for product, 'O' for order, 'I' for inventory, 'S' for shipping)
 */
export function generateCode(
  lastNumberToday: number,
  prefix: string = "P",
): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const next = lastNumberToday + 1;
  return `${prefix}${year}${next.toString().padStart(3, "0")}`;
}
