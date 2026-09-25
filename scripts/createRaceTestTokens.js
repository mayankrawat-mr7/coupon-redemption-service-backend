import "dotenv/config";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import jwt from "jsonwebtoken";

const TOKEN_COUNT = 200;
const secret = process.env.JWT_ACCESS_SECRET;

if (!secret) {
  throw new Error("JWT_ACCESS_SECRET is missing from the environment.");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Race-test tokens cannot be generated in production.");
}

const tokens = Array.from({ length: TOKEN_COUNT }, () =>
  jwt.sign(
    {
      id: randomBytes(12).toString("hex"),
      role: "customer",
    },
    secret,
    { expiresIn: "15m" }
  )
);

const tokenFile =
  process.env.CUSTOMER_TOKENS_FILE ||
  path.join(os.tmpdir(), "s7c-race-test-tokens.json");

await writeFile(tokenFile, JSON.stringify(tokens), { mode: 0o600 });
console.log(`Created ${tokens.length} short-lived test tokens in the OS temp folder.`);
console.log(`Token file: ${tokenFile}`);
