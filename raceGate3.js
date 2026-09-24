const CUSTOMER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYjNhNWFiNGQyODA5Y2U3NDFlNDU0OCIsIm5hbWUiOiJUZXN0IEN1c3RvbWVyIiwiZW1haWwiOiJjdXN0b21lckB0ZXN0LmNvbSIsInBob25lIjoiOTg3NjU0MzIxMCIsInJvbGUiOiJjdXN0b21lciIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjNUMTA6MTA6NTEuMzM0WiIsInVwZGF0ZWRBdCI6IjIwMjYtMDktMjNUMTA6MTA6NTEuMzM0WiIsInNlc3Npb25JZCI6IjExM2IxODk1MWVlMDgzODlmMjJiZWU0Y2FhNDNiM2Q4IiwiaWF0IjoxNzkwMjI0Mzg3LCJleHAiOjE3OTAzMTA3ODd9.EKs0yAXqItOrWG_OyN7SjQocKaVksYF0iPhg9WQrFrc";

const payload = {
  code: "RACE3",
  orderId: "IDEMPOTENCY-001",
};

const requests = Array.from({ length: 2 }, () =>
  fetch("http://localhost:1234/api/users/redemptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CUSTOMER_TOKEN}`,
    },
    body: JSON.stringify(payload),
  }).then(async (response) => ({
    status: response.status,
    body: await response.json(),
  }))
);

const results = await Promise.all(requests);

console.log("Results:", results);