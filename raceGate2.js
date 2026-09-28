import { loadRaceTestTokens } from "./utils/raceTestTokens.js";

const [CUSTOMER_TOKEN] = await loadRaceTestTokens();
const REQUEST_COUNT = 20;

const results = await Promise.all(
  Array.from({ length: REQUEST_COUNT }, async (_, index) => {
    try {
      const response = await fetch("http://localhost:1234/api/users/redemptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CUSTOMER_TOKEN}`,
        },
        body: JSON.stringify({
          code: "RACE2",
          orderId: `RACE2-ORDER-${index}`,
        }),
      });
      return { status: response.status, body: await response.json() };
    } catch (error) {
      return { status: 0, body: { message: error.message } };
    }
  })
);

const successes = results.filter(({ status }) => status === 201).length;
const failures = results.filter(({ status }) => status !== 201);
const failureMessages = failures.map(({ body }) =>
  body.errors?.map(({ message }) => message).join("; ") || body.message
);
const expectedFailures = failures.every((result) => result.status === 400);
const passed = successes === 1 && failures.length === REQUEST_COUNT - 1 && expectedFailures;

console.log(`Gate 2: ${REQUEST_COUNT} concurrent requests from one customer`);
console.log(`Successes: ${successes}/${REQUEST_COUNT}`);
console.log(`Rejected:  ${failures.length}/${REQUEST_COUNT}`);
if (failures.length) {
  console.log("Rejection reasons:");
  for (const [message, count] of Object.entries(
    Object.groupBy(failureMessages, (message) => message || "Unspecified error")
  )) {
    console.log(`  ${count.length}x ${message}`);
  }
}

console.log(passed ? "PASS: only one active redemption was created." : "FAIL: expected one success and nineteen HTTP 400 responses.");
if (!passed) process.exitCode = 1;
