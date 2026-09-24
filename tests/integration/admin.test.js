import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.JWT_ACCESS_SECRET = "itest-access-secret";

jest.unstable_mockModule("../../services/analyticsService.js", () => ({
  getAnalytics: jest.fn(),
}));

jest.unstable_mockModule("../../utils/logger.js", () => ({
  default: { log: jest.fn() },
}));

const analyticsService =
  await import("../../services/analyticsService.js");

const app = (await import("../../app.js")).default;

const createToken = (role, id = `${role}1`) =>
  jwt.sign(
    {
      id,
      role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1h",
    }
  );

const adminToken = createToken("admin");
const customerToken = createToken("customer");

describe("Admin integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/analytics", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await request(app)
        .get("/api/admin/analytics");

      expect(res.status).toBe(401);
      expect(
        analyticsService.getAnalytics
      ).not.toHaveBeenCalled();
    });

    it("should reject a customer", async () => {
      const res = await request(app)
        .get("/api/admin/analytics")
        .set(
          "Authorization",
          `Bearer ${customerToken}`
        );

      expect(res.status).toBe(403);
      expect(
        analyticsService.getAnalytics
      ).not.toHaveBeenCalled();
    });

    it("should return analytics for an admin", async () => {
      const analytics = {
        coupons: {
          total: 5,
          active: 4,
          paused: 1,
        },
        redemptions: {
          total: 10,
          applied: 8,
          reverted: 2,
        },
        usage: {
          totalUsed: 8,
          totalLimit: 500,
        },
      };

      analyticsService.getAnalytics.mockResolvedValue(
        analytics
      );

      const res = await request(app)
        .get("/api/admin/analytics")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe(
        "Analytics fetched successfully"
      );
      expect(res.body.data).toEqual(analytics);

      expect(
        analyticsService.getAnalytics
      ).toHaveBeenCalledTimes(1);
    });
  });
});