import { jest } from "@jest/globals";

// ---- Mocks -------------------------------------------------------------

const mockSession = {
  withTransaction: jest.fn(),
  endSession: jest.fn(),
};

jest.unstable_mockModule("mongoose", () => ({
  default: {
    startSession: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/couponModel.js", () => ({
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/redemptionModel.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("../../middlewares/appError.js", () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule("../../utils/apiFeatures.js", () => ({
  APIFeatures: jest.fn(),
}));

// ---- Imports (after mocking) -------------------------------------------

const {
  redeemCoupon,
  getMyRedemptions,
  getAllRedemptions,
  revertRedemption,
} = await import("../../services/redemptionService.js");

const mongoose = (await import("mongoose")).default;
const Coupon = (await import("../../models/couponModel.js")).default;
const Redemption = (await import("../../models/redemptionModel.js")).default;
const AppError = (await import("../../middlewares/appError.js")).default;
const { APIFeatures } = await import("../../utils/apiFeatures.js");

// ---- Helpers -----------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

const makeCoupon = (overrides = {}) => ({
  _id: "coupon1",
  code: "SAVE20",
  status: "ACTIVE",
  maxUses: 100,
  usedCount: 0,
  perUserLimit: 1,
  startsAt: new Date(Date.now() - DAY),
  expiresAt: new Date(Date.now() + DAY),
  ...overrides,
});

// Helper: mongoose query chain `.session(session)` resolves to value
const withSession = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

describe("RedemptionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AppError.mockImplementation((message, code) => {
      const error = new Error(message);
      error.statusCode = code;
      return error;
    });

    mongoose.startSession.mockResolvedValue(mockSession);
    mockSession.endSession.mockResolvedValue();
    // Run the transaction callback for real, like mongo's withTransaction
    mockSession.withTransaction.mockImplementation(async (cb) => cb());
  });

  // ------------------------------------------------------------------
  describe("redeemCoupon", () => {
    it("should throw 404 if coupon is not found", async () => {
      Coupon.findOne.mockResolvedValue(null);

      await expect(
        redeemCoupon("user1", "nope", "ORDER-1")
      ).rejects.toThrow("Coupon not found");

      expect(mongoose.startSession).not.toHaveBeenCalled();
    });

    it("should uppercase the code when looking up the coupon", async () => {
      Coupon.findOne.mockResolvedValue(null);

      await expect(
        redeemCoupon("user1", "save20", "ORDER-1")
      ).rejects.toThrow();

      expect(Coupon.findOne).toHaveBeenCalledWith({ code: "SAVE20" });
    });

    it("should throw if coupon is not ACTIVE", async () => {
      Coupon.findOne.mockResolvedValue(makeCoupon({ status: "PAUSED" }));

      await expect(
        redeemCoupon("user1", "SAVE20", "ORDER-1")
      ).rejects.toThrow("Coupon is not active");
    });

    it("should throw if coupon has not started yet", async () => {
      Coupon.findOne.mockResolvedValue(
        makeCoupon({ startsAt: new Date(Date.now() + DAY) })
      );

      await expect(
        redeemCoupon("user1", "SAVE20", "ORDER-1")
      ).rejects.toThrow("Coupon is not active yet");
    });

    it("should throw if coupon has expired", async () => {
      Coupon.findOne.mockResolvedValue(
        makeCoupon({
          startsAt: new Date(Date.now() - 2 * DAY),
          expiresAt: new Date(Date.now() - DAY),
        })
      );

      await expect(
        redeemCoupon("user1", "SAVE20", "ORDER-1")
      ).rejects.toThrow("Coupon has expired");
    });

    it("should redeem successfully (happy path)", async () => {
      const coupon = makeCoupon();
      const updatedCoupon = { ...coupon, usedCount: 1 };
      const created = {
        _id: "r1",
        couponId: "coupon1",
        userId: "user1",
        orderId: "ORDER-1",
        status: "APPLIED",
      };

      Coupon.findOne.mockResolvedValue(coupon);
      Redemption.findOne.mockReturnValue(withSession(null));
      Coupon.findOneAndUpdate.mockResolvedValue(updatedCoupon);
      Redemption.countDocuments.mockReturnValue(withSession(0));
      Redemption.create.mockResolvedValue([created]);

      const result = await redeemCoupon("user1", "SAVE20", "ORDER-1");

      expect(result).toEqual({ redemption: created, coupon: updatedCoupon });

      // Gate 1: atomic filter includes the maxUses check
      expect(Coupon.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: "coupon1",
          status: "ACTIVE",
          usedCount: { $lt: 100 },
        },
        { $inc: { usedCount: 1 } },
        { new: true, session: mockSession }
      );

      // Both writes pass the same session (Gate 4)
      expect(Redemption.create).toHaveBeenCalledWith(
        [
          {
            couponId: "coupon1",
            userId: "user1",
            orderId: "ORDER-1",
            status: "APPLIED",
          },
        ],
        { session: mockSession }
      );

      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it("should return the original redemption on a retry (idempotency)", async () => {
      const coupon = makeCoupon({ usedCount: 1 });
      const existing = {
        _id: "r1",
        couponId: "coupon1",
        userId: "user1",
        orderId: "ORDER-1",
        status: "APPLIED",
      };

      Coupon.findOne.mockResolvedValue(coupon);
      Redemption.findOne.mockReturnValue(withSession(existing));

      const result = await redeemCoupon("user1", "SAVE20", "ORDER-1");

      expect(result).toEqual({ redemption: existing, coupon });
      expect(Coupon.findOneAndUpdate).not.toHaveBeenCalled();
      expect(Redemption.create).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it("should throw when the global usage limit is reached", async () => {
      Coupon.findOne.mockResolvedValue(makeCoupon({ maxUses: 1, usedCount: 1 }));
      Redemption.findOne.mockReturnValue(withSession(null));
      Coupon.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        redeemCoupon("user1", "SAVE20", "ORDER-1")
      ).rejects.toThrow("Coupon usage limit reached");

      expect(Redemption.create).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it("should throw when the per-user limit is reached", async () => {
      Coupon.findOne.mockResolvedValue(makeCoupon({ perUserLimit: 1 }));
      Redemption.findOne.mockReturnValue(withSession(null));
      Coupon.findOneAndUpdate.mockResolvedValue(makeCoupon({ usedCount: 1 }));
      Redemption.countDocuments.mockReturnValue(withSession(1));

      await expect(
        redeemCoupon("user1", "SAVE20", "ORDER-2")
      ).rejects.toThrow("You have reached the coupon usage limit");

      expect(Redemption.create).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it("should always end the session even if the transaction throws", async () => {
      Coupon.findOne.mockResolvedValue(makeCoupon());
      mockSession.withTransaction.mockRejectedValue(new Error("db down"));

      await expect(
        redeemCoupon("user1", "SAVE20", "ORDER-1")
      ).rejects.toThrow("db down");

      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------------------------------
  describe("getMyRedemptions", () => {
    it("should return the user's redemptions, newest first", async () => {
      const redemptions = [{ _id: "r1" }, { _id: "r2" }];
      const sort = jest.fn().mockResolvedValue(redemptions);
      const populate = jest.fn().mockReturnValue({ sort });
      Redemption.find.mockReturnValue({ populate });

      const result = await getMyRedemptions("user1");

      expect(Redemption.find).toHaveBeenCalledWith({ userId: "user1" });
      expect(populate).toHaveBeenCalledWith("couponId");
      expect(sort).toHaveBeenCalledWith("-createdAt");
      expect(result).toEqual(redemptions);
    });
  });

  // ------------------------------------------------------------------
  describe("getAllRedemptions", () => {
    it("should apply filter/sort/limitFields/paginate and return results", async () => {
      const redemptions = [{ _id: "r1" }];

      const secondPopulate = jest.fn().mockReturnValue("QUERY");
      const firstPopulate = jest
        .fn()
        .mockReturnValue({ populate: secondPopulate });
      Redemption.find.mockReturnValue({ populate: firstPopulate });

      const features = {
        filter: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limitFields: jest.fn().mockReturnThis(),
        paginate: jest.fn().mockReturnThis(),
        query: Promise.resolve(redemptions),
      };
      APIFeatures.mockImplementation(() => features);

      const query = { status: "APPLIED", page: "2" };
      const result = await getAllRedemptions(query);

      expect(firstPopulate).toHaveBeenCalledWith("couponId");
      expect(secondPopulate).toHaveBeenCalledWith("userId", "name email");
      expect(APIFeatures).toHaveBeenCalledWith("QUERY", query);
      expect(features.filter).toHaveBeenCalled();
      expect(features.sort).toHaveBeenCalled();
      expect(features.limitFields).toHaveBeenCalled();
      expect(features.paginate).toHaveBeenCalled();
      expect(result).toEqual(redemptions);
    });
  });

  // ------------------------------------------------------------------
  describe("revertRedemption", () => {
    it("should throw 404 if the redemption does not exist", async () => {
      Redemption.findById.mockReturnValue(withSession(null));

      await expect(revertRedemption("r1")).rejects.toThrow(
        "Redemption not found"
      );

      expect(Coupon.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it("should throw if the redemption is already reverted", async () => {
      Redemption.findById.mockReturnValue(
        withSession({ _id: "r1", couponId: "coupon1", status: "REVERTED" })
      );

      await expect(revertRedemption("r1")).rejects.toThrow(
        "Redemption already reverted"
      );

      expect(Coupon.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("should throw if the coupon usedCount cannot be decremented", async () => {
      Redemption.findById.mockReturnValue(
        withSession({ _id: "r1", couponId: "coupon1", status: "APPLIED" })
      );
      Coupon.findOneAndUpdate.mockResolvedValue(null);

      await expect(revertRedemption("r1")).rejects.toThrow(
        "Coupon usage count cannot be decremented"
      );

      expect(Redemption.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("should throw if the redemption status update matches nothing", async () => {
      Redemption.findById.mockReturnValue(
        withSession({ _id: "r1", couponId: "coupon1", status: "APPLIED" })
      );
      Coupon.findOneAndUpdate.mockResolvedValue({ _id: "coupon1", usedCount: 0 });
      Redemption.findOneAndUpdate.mockResolvedValue(null);

      await expect(revertRedemption("r1")).rejects.toThrow(
        "Redemption could not be reverted"
      );
    });

    it("should revert atomically and return both documents", async () => {
      const coupon = { _id: "coupon1", usedCount: 0 };
      const reverted = { _id: "r1", status: "REVERTED" };

      Redemption.findById.mockReturnValue(
        withSession({ _id: "r1", couponId: "coupon1", status: "APPLIED" })
      );
      Coupon.findOneAndUpdate.mockResolvedValue(coupon);
      Redemption.findOneAndUpdate.mockResolvedValue(reverted);

      const result = await revertRedemption("r1");

      expect(result).toEqual({ redemption: reverted, coupon });

      expect(Coupon.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "coupon1", usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } },
        { new: true, session: mockSession }
      );
      expect(Redemption.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "r1", status: "APPLIED" },
        { status: "REVERTED" },
        { new: true, session: mockSession }
      );
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });
  });
});