import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const loadRaceTestTokens = async (count = 1) => {
  const tokenFile =
    process.env.CUSTOMER_TOKENS_FILE ||
    path.join(os.tmpdir(), "s7c-race-test-tokens.json");

  let tokens;
  try {
    tokens = JSON.parse(await readFile(tokenFile, "utf8"));
  } catch {
    throw new Error("No readable race token file. Run node scripts/createRaceTestTokens.js first.");
  }

  if (!Array.isArray(tokens) || tokens.length < count) {
    throw new Error(`CUSTOMER_TOKENS_FILE must contain at least ${count} tokens.`);
  }

  const selected = tokens.slice(0, count);
  for (let index = 0; index < selected.length; index++) {
    const parts = typeof selected[index] === "string" ? selected[index].split(".") : [];
    if (parts.length !== 3) {
      throw new Error(`Token ${index + 1} is not a JWT.`);
    }

    let claims;
    try {
      claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
      throw new Error(`Token ${index + 1} has an invalid payload.`);
    }

    if (claims.role !== "customer" || typeof claims.id !== "string" || !claims.id) {
      throw new Error(`Token ${index + 1} is not a customer token.`);
    }
    if (!claims.exp || claims.exp * 1000 <= Date.now()) {
      throw new Error(`Token ${index + 1} is expired or has no expiry.`);
    }
  }

  return selected;
};
