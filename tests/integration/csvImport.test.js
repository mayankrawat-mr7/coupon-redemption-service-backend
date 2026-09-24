import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
// import path from "path";

process.env.JWT_ACCESS_SECRET = "itest-access-secret";

jest.unstable_mockModule(
  "../../services/importJobService.js",
  () => ({
    createImportJob: jest.fn(),
    getImportJobById: jest.fn(),
  })
);

jest.unstable_mockModule("../../utils/logger.js", () => ({
  default: { log: jest.fn() },
}));

const importJobService =
  await import("../../services/importJobService.js");

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

describe("CSV import integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/coupons/import", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await request(app)
        .post("/api/admin/coupons/import");

      expect(res.status).toBe(401);
      expect(
        importJobService.createImportJob
      ).not.toHaveBeenCalled();
    });

    it("should reject requests without a CSV file", async () => {
      const res = await request(app)
        .post("/api/admin/coupons/import")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "CSV file is required"
      );

      expect(
        importJobService.createImportJob
      ).not.toHaveBeenCalled();
    });

    it("should queue a CSV import job", async () => {
      const importJob = {
        _id: "job1",
        fileName: "coupons.csv",
        status: "QUEUED",
        createdBy: "admin1",
        requestId: "request-123",
      };

      importJobService.createImportJob.mockResolvedValue(
        importJob
      );

      const csvContent = `code,discountType,discountValue,maxUses,perUserLimit,startsAt,expiresAt,status
SAVE20,PERCENT,20,100,1,2026-09-24,2026-12-31,ACTIVE`;

      const res = await request(app)
        .post("/api/admin/coupons/import")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        )
        .set("X-Request-Id", "request-123")
        .attach(
          "file",
          Buffer.from(csvContent),
          "coupons.csv"
        );

      expect(res.status).toBe(202);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe(
        "CSV import job queued successfully"
      );
      expect(res.body.data).toEqual(importJob);

      expect(
        importJobService.createImportJob
      ).toHaveBeenCalledTimes(1);

      const call =
        importJobService.createImportJob.mock.calls[0][0];

      expect(call.fileName).toBe("coupons.csv");
      expect(call.createdBy).toBe("admin1");
      expect(call.requestId).toBe("request-123");
      expect(call.filePath).toEqual(expect.any(String));
    });
  });

  describe("GET /api/admin/coupons/import/:id", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await request(app)
        .get("/api/admin/coupons/import/job1");

      expect(res.status).toBe(401);
      expect(
        importJobService.getImportJobById
      ).not.toHaveBeenCalled();
    });

    it("should return import job status", async () => {
      const importJob = {
        _id: "job1",
        fileName: "coupons.csv",
        status: "COMPLETED",
        totalRows: 3,
        processedRows: 3,
        successfulRows: 2,
        failedRows: 1,
        rowErrors: [
          {
            row: 3,
            message: "Coupon code already exists",
          },
        ],
      };

      importJobService.getImportJobById.mockResolvedValue(
        importJob
      );

      const res = await request(app)
        .get("/api/admin/coupons/import/job1")
        .set(
          "Authorization",
          `Bearer ${adminToken}`
        );

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe(
        "Import job status fetched successfully"
      );
      expect(res.body.data).toEqual(importJob);

      expect(
        importJobService.getImportJobById
      ).toHaveBeenCalledWith("job1");
    });
  });
});