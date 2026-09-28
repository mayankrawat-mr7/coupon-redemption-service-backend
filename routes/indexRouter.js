import express from "express";
import userRouter from "./userRouter.js";
import adminRouter from "./adminRouter.js";
import publicRouter from "./publicRouter.js";
import { verifyToken } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = express.Router();

// User routes
router.use("/users", userRouter);

// Admin routes
router.use(
  "/admin",
  verifyToken("access"),
  requireRole("admin"),
  adminRouter
);

// Public routes
router.use("/public", publicRouter);

export default router;