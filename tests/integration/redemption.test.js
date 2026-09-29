import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.JWT_ACCESS_SECRET = "itest-access-secret";

jest.unstable_mockModule("../../services/redemptionService.js", () => ({
  redeemCoupon: jest.fn(),
  getMyRedemptions: jest.fn(),
  revertRedemption: jest.fn(),
  getAllRedemptions: jest.fn(),
}));

jest.unstable_mockModule("../../utils/logger.js", () => ({
  default: { log: jest.fn() },
  logSuccess: jest.fn(),
}));

const redemptionService =
  await import("../../services/redemptionService.js");

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

const customerToken = createToken("customer", "customer1");
const adminToken = createToken("admin", "admin1");

describe("Redemption integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/users/redemptions", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await request(app)
        .post("/api/users/redemptions")
        .send({
          code: "SAVE20",
          orderId: "ORDER-001",
          orderAmount: 100,
        });

      expect(res.status).toBe(401);
      expect(redemptionService.redeemCoupon).not.toHaveBeenCalled();
    });

    it("should reject invalid redemption data", async () => {
      const res = await request(app)
        .post("/api/users/redemptions")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          code: "",
          orderId: "",
          orderAmount: 0,
        });

      expect(res.status).toBe(400);
      expect(redemptionService.redeemCoupon).not.toHaveBeenCalled();
    });

    it("should redeem a coupon successfully", async () => {
      const result = {
        redemption: {
          _id: "redemption1",
          couponId: "coupon1",
          userId: "customer1",
          orderId: "ORDER-001",
          orderAmount: 100,
          status: "APPLIED",
        },
        coupon: {
          _id: "coupon1",
          code: "SAVE20",
          usedCount: 1,
          maxUses: 100,
        },
      };

      redemptionService.redeemCoupon.mockResolvedValue(result);

      const res = await request(app)
        .post("/api/users/redemptions")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          code: "SAVE20",
          orderId: "ORDER-001",
          orderAmount: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe("Coupon redeemed successfully");
      expect(res.body.data).toEqual(result);

      expect(redemptionService.redeemCoupon).toHaveBeenCalledWith(
        "customer1",
        "SAVE20",
        "ORDER-001",
        100
      );
    });
  });

  describe("GET /api/users/redemptions", () => {
    it("should return the customer's redemption history", async () => {
      const redemptions = [
        {
          _id: "redemption1",
          couponId: "coupon1",
          userId: "customer1",
          orderId: "ORDER-001",
          status: "APPLIED",
        },
      ];

      redemptionService.getMyRedemptions.mockResolvedValue(
        redemptions
      );

      const res = await request(app)
        .get("/api/users/redemptions")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe(
        "Redemption history fetched successfully"
      );
      expect(res.body.data).toEqual(redemptions);

      expect(
        redemptionService.getMyRedemptions
      ).toHaveBeenCalledWith("customer1");
    });

    it("should reject unauthenticated history requests", async () => {
      const res = await request(app)
        .get("/api/users/redemptions");

      expect(res.status).toBe(401);
      expect(
        redemptionService.getMyRedemptions
      ).not.toHaveBeenCalled();
    });
  });

    describe("GET /api/admin/redemptions", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await request(app).get("/api/admin/redemptions");

      expect(res.status).toBe(401);
      expect(
        redemptionService.getAllRedemptions
      ).not.toHaveBeenCalled();
    });

    it("should reject a customer from listing all redemptions", async () => {
      const res = await request(app)
        .get("/api/admin/redemptions")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(
        redemptionService.getAllRedemptions
      ).not.toHaveBeenCalled();
    });

    it("should return all redemptions for an admin", async () => {
      const redemptions = [
        {
          _id: "redemption1",
          couponId: "coupon1",
          userId: "customer1",
          orderId: "ORDER-001",
          status: "APPLIED",
        },
        {
          _id: "redemption2",
          couponId: "coupon1",
          userId: "customer2",
          orderId: "ORDER-002",
          status: "REVERTED",
        },
      ];

      redemptionService.getAllRedemptions.mockResolvedValue(
        redemptions
      );

      const res = await request(app)
        .get("/api/admin/redemptions")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe(
        "Redemptions fetched successfully"
      );
      expect(res.body.data).toEqual(redemptions);
      expect(
        redemptionService.getAllRedemptions
      ).toHaveBeenCalledTimes(1);
    });

    it("should pass query params (filter/sort/pagination) to the service", async () => {
      redemptionService.getAllRedemptions.mockResolvedValue([]);

      const res = await request(app)
        .get("/api/admin/redemptions?status=APPLIED&page=2&limit=5")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(
        redemptionService.getAllRedemptions
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "APPLIED",
          page: "2",
          limit: "5",
        })
      );
    });
  });

  describe("PATCH /api/admin/redemptions/:id/revert", () => {
    it("should reject a customer from reverting a redemption", async () => {
      const res = await request(app)
        .patch("/api/admin/redemptions/redemption1/revert")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(
        redemptionService.revertRedemption
      ).not.toHaveBeenCalled();
    });

    it("should reject unauthenticated revert requests", async () => {
      const res = await request(app)
        .patch("/api/admin/redemptions/redemption1/revert");

      expect(res.status).toBe(401);
      expect(
        redemptionService.revertRedemption
      ).not.toHaveBeenCalled();
    });

    it("should revert a redemption as an admin", async () => {
      const result = {
        redemption: {
          _id: "redemption1",
          status: "REVERTED",
        },
        coupon: {
          _id: "coupon1",
          usedCount: 0,
        },
      };

      redemptionService.revertRedemption.mockResolvedValue(
        result
      );

      const res = await request(app)
        .patch("/api/admin/redemptions/redemption1/revert")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe(
        "Redemption reverted successfully"
      );
      expect(res.body.data).toEqual(result);

      expect(
        redemptionService.revertRedemption
      ).toHaveBeenCalledWith("redemption1");
    });
  });
});
