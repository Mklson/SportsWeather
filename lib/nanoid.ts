import { randomBytes } from "crypto";

/** URL-safe random string of given length. */
export function nanoid(length = 21): string {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .slice(0, length);
}
