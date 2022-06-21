import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

let secret: string | undefined = undefined;

export function getJwtSecret() {
  if (!secret) {
    secret = process.env.DEBUG || randomBytes(256).toString("hex");
  }

  return secret;
}

export function createJwt(username: string): string {
  const payload = { username };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "8h" });
  return token;
}
