import { jest } from "@jest/globals";

// ---- Mocks -------------------------------------------------------------

jest.unstable_mockModule("../../models/couponModel.js", () => ({
  default: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/redemptionModel.js", () => ({
  default: {
    countDocuments: jest.fn(),
  },
}));

// ---- Imports (after mocking) -------------------------------------------

const { getAnalytics } = await import("../../services/analyticsService.js");

const Coupon = (await import("../../models/couponModel.js")).default;
const Redemption = (await import("../../models/redemptionModel.js")).default;

describe("AnalyticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Coupon.countDocuments.mockResolvedValueOnce(10);

    // Redemption.countDocuments is called in order: total, applied, reverted
    Redemption.countDocuments
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(45)
      .mockResolvedValueOnce(5);
  });

  describe("getAnalytics", () => {
    it("should return coupon, redemption and usage stats", async () => {
      Coupon.aggregate.mockResolvedValue([
        { _id: null, totalUsage: 120, totalUsageLimit: 1000 },
      ]);

      const result = await getAnalytics();

      expect(result).toEqual({
        coupons: { total: 10 },
        redemptions: { total: 50, applied: 45, reverted: 5 },
        usage: { totalUsed: 120, totalLimit: 1000 },
      });
    });

    it("should query coupon totals and redemption status counts", async () => {
      Coupon.aggregate.mockResolvedValue([]);

      await getAnalytics();

      expect(Coupon.countDocuments).toHaveBeenCalledTimes(1);
      expect(Coupon.countDocuments).toHaveBeenNthCalledWith(1);

      expect(Redemption.countDocuments).toHaveBeenCalledTimes(3);
      expect(Redemption.countDocuments).toHaveBeenNthCalledWith(1);
      expect(Redemption.countDocuments).toHaveBeenNthCalledWith(2, {
        status: "APPLIED",
      });
      expect(Redemption.countDocuments).toHaveBeenNthCalledWith(3, {
        status: "REVERTED",
      });
    });

    it("should aggregate total usage and total limit across coupons", async () => {
      Coupon.aggregate.mockResolvedValue([]);

      await getAnalytics();

      expect(Coupon.aggregate).toHaveBeenCalledWith([
        {
          $group: {
            _id: null,
            totalUsage: { $sum: "$usedCount" },
            totalUsageLimit: { $sum: "$maxUses" },
          },
        },
      ]);
    });

    it("should default usage to 0 when there are no coupons", async () => {
      Coupon.aggregate.mockResolvedValue([]);

      const result = await getAnalytics();

      expect(result.usage).toEqual({ totalUsed: 0, totalLimit: 0 });
    });

    it("should propagate errors from the database", async () => {
      Coupon.countDocuments.mockReset();
      Coupon.countDocuments.mockRejectedValue(new Error("db down"));

      await expect(getAnalytics()).rejects.toThrow("db down");
    });
  });
});
