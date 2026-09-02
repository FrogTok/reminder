import crypto from "node:crypto";

export function generatePassword() {
  return crypto.randomBytes(9).toString("base64url");
}
