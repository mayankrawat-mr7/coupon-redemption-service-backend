const CUSTOMER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYjNhNWFiNGQyODA5Y2U3NDFlNDU0OCIsIm5hbWUiOiJUZXN0IEN1c3RvbWVyIiwiZW1haWwiOiJjdXN0b21lckB0ZXN0LmNvbSIsInBob25lIjoiOTg3NjU0MzIxMCIsInJvbGUiOiJjdXN0b21lciIsImNyZWF0ZWRBdCI6IjIwMjYtMDktMjNUMTA6MTA6NTEuMzM0WiIsInVwZGF0ZWRBdCI6IjIwMjYtMDktMjNUMTA6MTA6NTEuMzM0WiIsInNlc3Npb25JZCI6IjUzMmNjOGIyYmU5ODk1YmJlOWNiNTFlODMwMDY3NTU5IiwiaWF0IjoxNzkwMTU5NjI1LCJleHAiOjE3OTAyNDYwMjV9.1SVJtqvovQJ0R3fqYD1HBQTi3g0MhuPtov3-fUzKJ7g";

const requests = Array.from({ length: 200 }, (_, index) =>
    fetch("http://localhost:1234/api/users/redemptions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CUSTOMER_TOKEN}`,
        },
        body: JSON.stringify({
            code: "RACE1",
            orderId: `RACE-ORDER-${index}`,
        }),
    }).then(async (response) => ({
        status: response.status,
        body: await response.json(),
    }))
);

const results = await Promise.all(requests);

const successes = results.filter(
    (result) => result.status === 201
).length;

const failures = results.filter(
    (result) => result.status !== 201
).length;

console.log("Successes:", successes);
console.log("Failures:", failures);

console.log(
    "Successful responses:",
    results.filter((result) => result.status === 201)
);