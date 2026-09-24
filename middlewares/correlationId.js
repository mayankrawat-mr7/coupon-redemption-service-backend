import { randomUUID } from "crypto";

export const correlationId = (req, res, next) => {
  const requestId = req.get("X-Request-Id") || randomUUID();

  req.requestId = requestId;

  res.setHeader("X-Request-Id", requestId);

  next();
};