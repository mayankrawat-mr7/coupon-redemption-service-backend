import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REQUEST_COUNT = 200;
const apiBaseUrl = (process.env.API_BASE_URL || "http://localhost:1234").replace(
  /\/$/,
  ""
);
const couponCode = process.env.RACE_COUPON_CODE || "RACE1";

const readCustomerTokens = async () => {
  const tokenFile =
    process.env.CUSTOMER_TOKENS_FILE ||
    path.join(os.tmpdir(), "s7c-race-test-tokens.json");

  let fileContents;
  try {
    fileContents = await readFile(tokenFile, "utf8");
  } catch (error) {
    throw new Error(
      `No readable race token file (${error.code || "read error"}). Run node scripts/createRaceTestTokens.js first.`
    );
  }

  let tokens;
  try {
    tokens = JSON.parse(fileContents);
  } catch {
    throw new Error("The token file must contain a valid JSON array.");
  }

  if (!Array.isArray(tokens) || tokens.length < REQUEST_COUNT) {
    throw new Error(`The token file must contain at least ${REQUEST_COUNT} tokens.`);
  }

  return tokens.slice(0, REQUEST_COUNT).map((token, index) => {
    const entry = index + 1;
    if (typeof token !== "string") {
      throw new Error(`Token ${entry} must be a string.`);
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error(`Token ${entry} is not a JWT.`);
    }

    let claims;
    try {
      claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
      throw new Error(`Token ${entry} has an invalid JWT payload.`);
    }

    if (claims.role !== "customer" || typeof claims.id !== "string" || !claims.id) {
      throw new Error(`Token ${entry} must belong to a customer and include an id.`);
    }
    if (!claims.exp || claims.exp * 1000 <= Date.now()) {
      throw new Error(`Token ${entry} is expired or has no expiry.`);
    }

    return { token, userId: claims.id };
  });
};

const getErrorMessage = (body) => {
  if (Array.isArray(body?.errors)) {
    return body.errors.map((error) => error.message).filter(Boolean).join("; ");
  }
  return body?.message || "No error message returned";
};

const isCouponExhausted = (result) =>
  result.status === 400 &&
  /coupon (usage limit reached|exhausted)/i.test(getErrorMessage(result.body));

const sendRedemption = async ({ token, userId }, index) => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/users/redemptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: couponCode,
        orderId: `RACE1-ORDER-${index}`,
      }),
    });

    const responseText = await response.text();
    let body;
    try {
      body = JSON.parse(responseText);
    } catch {
      body = { message: responseText || "Response was not JSON" };
    }

    return { request: index + 1, userId, status: response.status, body };
  } catch (error) {
    return {
      request: index + 1,
      userId,
      status: 0,
      body: { message: error.message },
    };
  }
};

const main = async () => {
  const customers = await readCustomerTokens();
  const uniqueUsers = new Set(customers.map(({ userId }) => userId));
  if (uniqueUsers.size !== REQUEST_COUNT) {
    throw new Error(`The first ${REQUEST_COUNT} tokens must belong to distinct users.`);
  }

  console.log(`Gate 1: ${couponCode}, ${REQUEST_COUNT} requests, ${uniqueUsers.size} customers`);
  console.log("Expected: 1 success and 199 coupon-exhausted responses (HTTP 400).\n");

  const results = await Promise.all(customers.map(sendRedemption));
  const successes = results.filter(({ status }) => status === 201);
  const exhausted = results.filter(isCouponExhausted);
  const unexpected = results.filter(
    (result) => result.status !== 201 && !isCouponExhausted(result)
  );

  console.log(`Requests:  ${results.length}`);
  console.log(`Successes: ${successes.length}`);
  console.log(`Exhausted: ${exhausted.length}`);
  console.log(`Unexpected: ${unexpected.length}`);

  if (unexpected.length) {
    console.log("Unexpected responses:");
    for (const result of unexpected.slice(0, 5)) {
      console.log(
        `  Request ${result.request}: HTTP ${result.status} - ${getErrorMessage(result.body)}`
      );
    }
    if (unexpected.length > 5) {
      console.log(`  ...and ${unexpected.length - 5} more`);
    }
  }

  if (successes.length === 1 && exhausted.length === REQUEST_COUNT - 1 && !unexpected.length) {
    console.log("\nPASS: Gate 1 behaved as expected.");
    return;
  }

  console.error("\nFAIL: expected exactly one success and 199 coupon-exhausted responses.");
  process.exitCode = 1;
};

main().catch((error) => {
  console.error(`\nSetup error: ${error.message}`);
  if (error.message.includes("No readable")) {
    console.error("Run node scripts/createRaceTestTokens.js, then retry.");
    console.error("Gate 1 requires 200 distinct customer tokens.");
  }
  process.exitCode = 1;
});
