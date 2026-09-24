import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.JWT_ACCESS_SECRET = "itest-access-secret";

jest.unstable_mockModule("../../services/couponService.js", () => ({
  createCoupon: jest.fn(),
  getAllCoupons: jest.fn(),
  getCouponById: jest.fn(),
  updateCoupon: jest.fn(),
  pauseCoupon: jest.fn(),
  deleteCoupon: jest.fn(),
}));

jest.unstable_mockModule("../../utils/logger.js", () => ({
  default: { log: jest.fn() },
}));

const couponService = await import("../../services/couponService.js");
const app = (await import("../../app.js")).default;

const createToken = (role) =>
  jwt.sign(
    {
      id: `${role}1`,
      role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1h",
    }
  );

const adminToken = createToken("admin");
const customerToken = createToken("customer");

const couponPayload = {
  code: "SAVE20",
  discountType: "PERCENT",
  discountValue: 20,
  maxUses: 100,
  perUserLimit: 1,
  startsAt: "2026-09-24",
  expiresAt: "2026-12-31",
  status: "ACTIVE",
};

describe("Coupon integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication and authorization", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await request(app)
        .get("/api/admin/coupons");

      expect(res.status).toBe(401);
      expect(couponService.getAllCoupons).not.toHaveBeenCalled();
    });

    it("should reject a customer from admin coupon routes", async () => {
      const res = await request(app)
        .get("/api/admin/coupons")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(couponService.getAllCoupons).not.toHaveBeenCalled();
    });

    it("should allow an admin to access coupon routes", async () => {
      couponService.getAllCoupons.mockResolvedValue([]);

      const res = await request(app)
        .get("/api/admin/coupons")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(couponService.getAllCoupons).toHaveBeenCalledWith({});
    });
  });

  describe("POST /api/admin/coupons", () => {
    it("should reject invalid coupon data", async () => {
      const res = await request(app)
        .post("/api/admin/coupons")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          code: "BAD",
          discountType: "INVALID",
        });

      expect(res.status).toBe(400);
      expect(couponService.createCoupon).not.toHaveBeenCalled();
    });

    it("should create a coupon", async () => {
      const createdCoupon = {
        _id: "coupon1",
        ...couponPayload,
      };

      couponService.createCoupon.mockResolvedValue(createdCoupon);

      const res = await request(app)
        .post("/api/admin/coupons")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(couponPayload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe("Coupon created successfully");
      expect(res.body.data._id).toBe("coupon1");

      expect(couponService.createCoupon).toHaveBeenCalledWith({
  ...couponPayload,
  startsAt: new Date("2026-09-24"),
  expiresAt: new Date("2026-12-31"),
});
    });
  });

  describe("GET /api/admin/coupons", () => {
    it("should return all coupons", async () => {
      const coupons = [
        {
          _id: "coupon1",
          code: "SAVE20",
          discountType: "PERCENT",
          discountValue: 20,
        },
      ];

      couponService.getAllCoupons.mockResolvedValue(coupons);

      const res = await request(app)
        .get("/api/admin/coupons")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(coupons);

      expect(couponService.getAllCoupons).toHaveBeenCalledWith({});
    });
  });

  describe("GET /api/admin/coupons/:id", () => {
    it("should return a coupon by ID", async () => {
      const coupon = {
        _id: "coupon1",
        ...couponPayload,
      };

      couponService.getCouponById.mockResolvedValue(coupon);

      const res = await request(app)
        .get("/api/admin/coupons/coupon1")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Coupon fetched successfully");
      expect(res.body.data._id).toBe("coupon1");

      expect(couponService.getCouponById).toHaveBeenCalledWith(
        "coupon1"
      );
    });
  });

  describe("PUT /api/admin/coupons/:id", () => {
    it("should update a coupon", async () => {
      const updatedCoupon = {
        _id: "coupon1",
        ...couponPayload,
        discountValue: 30,
      };

      couponService.updateCoupon.mockResolvedValue(updatedCoupon);

      const res = await request(app)
        .put("/api/admin/coupons/coupon1")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          discountValue: 30,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Coupon updated successfully");
      expect(res.body.data.discountValue).toBe(30);

      expect(couponService.updateCoupon).toHaveBeenCalledWith(
        "coupon1",
        {
          discountValue: 30,
        }
      );
    });
  });

  describe("PATCH /api/admin/coupons/:id/pause", () => {
    it("should pause a coupon", async () => {
      const pausedCoupon = {
        _id: "coupon1",
        ...couponPayload,
        status: "PAUSED",
      };

      couponService.pauseCoupon.mockResolvedValue(pausedCoupon);

      const res = await request(app)
        .patch("/api/admin/coupons/coupon1/pause")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Coupon paused successfully");
      expect(res.body.data.status).toBe("PAUSED");

      expect(couponService.pauseCoupon).toHaveBeenCalledWith(
        "coupon1"
      );
    });
  });

  describe("DELETE /api/admin/coupons/:id", () => {
    it("should delete a coupon", async () => {
      const deletedCoupon = {
        _id: "coupon1",
        ...couponPayload,
      };

      couponService.deleteCoupon.mockResolvedValue(deletedCoupon);

      const res = await request(app)
        .delete("/api/admin/coupons/coupon1")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Coupon deleted successfully");
      expect(res.body.data.deleted._id).toBe("coupon1");

      expect(couponService.deleteCoupon).toHaveBeenCalledWith(
        "coupon1"
      );
    });
  });
});