import { jest } from "@jest/globals";

// Mock Coupon model
jest.unstable_mockModule("../../models/couponModel.js", () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

// Mock AppError
jest.unstable_mockModule("../../middlewares/appError.js", () => ({
  default: jest.fn(),
}));

// Mock APIFeatures
jest.unstable_mockModule("../../utils/apiFeatures.js", () => ({
  APIFeatures: jest.fn(),
}));

// Import after mocking
const {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  pauseCoupon,
  deleteCoupon,
} = await import("../../services/couponService.js");

const Coupon = (await import("../../models/couponModel.js")).default;

const AppError = (await import("../../middlewares/appError.js")).default;

const { APIFeatures } = await import("../../utils/apiFeatures.js");

describe("CouponService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AppError.mockImplementation((message, code) => {
      const error = new Error(message);
      error.statusCode = code;
      return error;
    });
  });

  describe("createCoupon", () => {
    it("should create a coupon successfully", async () => {
      const couponData = {
        code: "SAVE10",
        discountType: "PERCENT",
        discountValue: 10,
        maxUses: 100,
        perUserLimit: 1,
        startsAt: new Date(),
        expiresAt: new Date(),
        status: "ACTIVE",
      };

      const mockCoupon = {
        _id: "coupon123",
        ...couponData,
        code: "SAVE10",
        usedCount: 0,
      };

      Coupon.findOne.mockResolvedValue(null);
      Coupon.create.mockResolvedValue(mockCoupon);

      const result = await createCoupon(couponData);

      expect(Coupon.findOne).toHaveBeenCalledWith({
        code: "SAVE10",
      });

      expect(Coupon.create).toHaveBeenCalledWith({
        ...couponData,
        code: "SAVE10",
      });

      expect(result).toEqual(mockCoupon);
    });

    it("should throw error when coupon code already exists", async () => {
      Coupon.findOne.mockResolvedValue({
        _id: "existingCoupon",
        code: "SAVE10",
      });

      await expect(
        createCoupon({
          code: "SAVE10",
        })
      ).rejects.toThrow("Coupon code already exists");

      expect(Coupon.create).not.toHaveBeenCalled();
    });
  });

  describe("getAllCoupons", () => {
    it("should return all coupons using APIFeatures", async () => {
      const mockCoupons = [
        {
          _id: "coupon1",
          code: "SAVE10",
        },
        {
          _id: "coupon2",
          code: "SAVE20",
        },
      ];

      const mockQuery = Promise.resolve(mockCoupons);

      const mockFeatures = {
        filter: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limitFields: jest.fn().mockReturnThis(),
        paginate: jest.fn().mockReturnThis(),
        query: mockQuery,
      };

      APIFeatures.mockImplementation(() => mockFeatures);

      const result = await getAllCoupons({
        status: "ACTIVE",
        page: "1",
        limit: "10",
      });

      expect(APIFeatures).toHaveBeenCalledWith(
        Coupon.find(),
        {
          status: "ACTIVE",
          page: "1",
          limit: "10",
        }
      );

      expect(mockFeatures.filter).toHaveBeenCalled();
      expect(mockFeatures.sort).toHaveBeenCalled();
      expect(mockFeatures.limitFields).toHaveBeenCalled();
      expect(mockFeatures.paginate).toHaveBeenCalled();

      expect(result).toEqual(mockCoupons);
    });
  });

  describe("getCouponById", () => {
    it("should return coupon by ID", async () => {
      const mockCoupon = {
        _id: "coupon123",
        code: "SAVE10",
      };

      Coupon.findById.mockResolvedValue(mockCoupon);

      const result = await getCouponById("coupon123");

      expect(Coupon.findById).toHaveBeenCalledWith("coupon123");
      expect(result).toEqual(mockCoupon);
    });

    it("should throw error when coupon is not found", async () => {
      Coupon.findById.mockResolvedValue(null);

      await expect(
        getCouponById("invalidId")
      ).rejects.toThrow("Coupon not found");
    });
  });

  describe("updateCoupon", () => {
    it("should update coupon successfully", async () => {
      const updateData = {
        discountValue: 15,
      };

      const mockCoupon = {
        _id: "coupon123",
        code: "SAVE10",
        discountValue: 15,
      };

      Coupon.findByIdAndUpdate.mockResolvedValue(mockCoupon);

      const result = await updateCoupon(
        "coupon123",
        updateData
      );

      expect(Coupon.findByIdAndUpdate).toHaveBeenCalledWith(
        "coupon123",
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      expect(result).toEqual(mockCoupon);
    });

    it("should prevent usedCount from being updated", async () => {
      const updateData = {
        discountValue: 15,
        usedCount: 999,
      };

      const mockCoupon = {
        _id: "coupon123",
        code: "SAVE10",
        discountValue: 15,
      };

      Coupon.findByIdAndUpdate.mockResolvedValue(mockCoupon);

      await updateCoupon("coupon123", updateData);

      expect(Coupon.findByIdAndUpdate).toHaveBeenCalledWith(
        "coupon123",
        {
          discountValue: 15,
        },
        {
          new: true,
          runValidators: true,
        }
      );
    });

    it("should throw error when updating to an existing coupon code", async () => {
      Coupon.findOne.mockResolvedValue({
        _id: "anotherCoupon",
        code: "SAVE20",
      });

      await expect(
        updateCoupon("coupon123", {
          code: "SAVE20",
        })
      ).rejects.toThrow("Coupon code already exists");

      expect(Coupon.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("should throw error when coupon does not exist", async () => {
      Coupon.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        updateCoupon("coupon123", {
          discountValue: 20,
        })
      ).rejects.toThrow("Coupon not found");
    });
  });

  describe("pauseCoupon", () => {
    it("should pause coupon successfully", async () => {
      const mockCoupon = {
        _id: "coupon123",
        code: "SAVE10",
        status: "PAUSED",
      };

      Coupon.findByIdAndUpdate.mockResolvedValue(mockCoupon);

      const result = await pauseCoupon("coupon123");

      expect(Coupon.findByIdAndUpdate).toHaveBeenCalledWith(
        "coupon123",
        {
          status: "PAUSED",
        },
        {
          new: true,
          runValidators: true,
        }
      );

      expect(result).toEqual(mockCoupon);
    });

    it("should throw error when coupon does not exist", async () => {
      Coupon.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        pauseCoupon("coupon123")
      ).rejects.toThrow("Coupon not found");
    });
  });

  describe("deleteCoupon", () => {
    it("should delete coupon successfully", async () => {
      const mockCoupon = {
        _id: "coupon123",
        code: "SAVE10",
      };

      Coupon.findByIdAndDelete.mockResolvedValue(mockCoupon);

      const result = await deleteCoupon("coupon123");

      expect(Coupon.findByIdAndDelete).toHaveBeenCalledWith(
        "coupon123"
      );

      expect(result).toEqual(mockCoupon);
    });

    it("should throw error when coupon does not exist", async () => {
      Coupon.findByIdAndDelete.mockResolvedValue(null);

      await expect(
        deleteCoupon("coupon123")
      ).rejects.toThrow("Coupon not found");
    });
  });
});