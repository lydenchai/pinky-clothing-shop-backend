import crypto from "crypto";

/**
 * Generate a MongoDB-style ObjectId (24 hex chars)
 */
export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = crypto.randomBytes(8).toString("hex");
  return timestamp + random; // 24 chars
}
