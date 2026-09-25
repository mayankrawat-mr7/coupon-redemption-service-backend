import { loadRaceTestTokens } from "./utils/raceTestTokens.js";

const [CUSTOMER_TOKEN] = await loadRaceTestTokens();
const payload = { code: "RACE3", orderId: "IDEMPOTENCY-001" };

const sendRequest = async () => {
  const response = await fetch("http://localhost:1234/api/users/redemptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CUSTOMER_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
};

try {
  const first = await sendRequest();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const retry = await sendRequest();
  const firstId = first.body.data?.redemption?._id;
  const retryId = retry.body.data?.redemption?._id;
  const passed =
    first.status === 201 && retry.status === 201 && firstId && firstId === retryId;

  console.log("Gate 3: retry the same customer, coupon, and order");
  console.log(`First request: HTTP ${first.status}, redemption ${firstId || "none"}`);
  console.log(`Retry:         HTTP ${retry.status}, redemption ${retryId || "none"}`);
  console.log(
    passed
      ? "PASS: retry returned the original successful redemption."
      : "FAIL: both responses should be successful and return the same redemption."
  );
  if (!passed) {
    console.log("First response:", first.body);
    console.log("Retry response:", retry.body);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Gate 3 request failed: ${error.message}`);
  process.exitCode = 1;
}
