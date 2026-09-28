import { jest } from "@jest/globals";

// ---- Mocks -------------------------------------------------------------

jest.unstable_mockModule("../../models/importJobModel.js", () => ({
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.unstable_mockModule("../../middlewares/appError.js", () => ({
  default: jest.fn(),
}));

// ---- Imports (after mocking) -------------------------------------------

const {
  createImportJob,
  getImportJobById,
  claimNextImportJob,
  updateImportJob,
} = await import("../../services/importJobService.js");

const ImportJob = (await import("../../models/importJobModel.js")).default;
const AppError = (await import("../../middlewares/appError.js")).default;

describe("ImportJobService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AppError.mockImplementation((message, code) => {
      const error = new Error(message);
      error.statusCode = code;
      return error;
    });
  });

  // ------------------------------------------------------------------
  describe("createImportJob", () => {
    it("should create a job with QUEUED status", async () => {
      const input = {
        fileName: "coupons.csv",
        filePath: "uploads/coupons.csv",
        createdBy: "admin1",
        requestId: "req-123",
      };
      const created = { _id: "job1", ...input, status: "QUEUED" };

      ImportJob.create.mockResolvedValue(created);

      const result = await createImportJob(input);

      expect(ImportJob.create).toHaveBeenCalledWith({
        ...input,
        status: "QUEUED",
      });
      expect(result).toEqual(created);
    });

    it("should propagate database errors", async () => {
      ImportJob.create.mockRejectedValue(new Error("db down"));

      await expect(
        createImportJob({
          fileName: "a.csv",
          filePath: "uploads/a.csv",
          createdBy: "admin1",
          requestId: "req-1",
        })
      ).rejects.toThrow("db down");
    });
  });

  // ------------------------------------------------------------------
  describe("getImportJobById", () => {
    it("should return the job without exposing filePath", async () => {
      const job = { _id: "job1", status: "COMPLETED" };
      const select = jest.fn().mockResolvedValue(job);
      ImportJob.findById.mockReturnValue({ select });

      const result = await getImportJobById("job1");

      expect(ImportJob.findById).toHaveBeenCalledWith("job1");
      expect(select).toHaveBeenCalledWith("-filePath");
      expect(result).toEqual(job);
    });

    it("should throw 404 if the job does not exist", async () => {
      const select = jest.fn().mockResolvedValue(null);
      ImportJob.findById.mockReturnValue({ select });

      await expect(getImportJobById("missing")).rejects.toThrow(
        "Import job not found"
      );
      expect(AppError).toHaveBeenCalledWith("Import job not found", 404);
    });
  });

  // ------------------------------------------------------------------
  describe("claimNextImportJob", () => {
    it("should atomically claim the oldest QUEUED job", async () => {
      const claimed = { _id: "job1", status: "PROCESSING" };
      ImportJob.findOneAndUpdate.mockResolvedValue(claimed);

      const result = await claimNextImportJob();

      expect(ImportJob.findOneAndUpdate).toHaveBeenCalledWith(
        { status: "QUEUED" },
        {
          $set: {
            status: "PROCESSING",
            startedAt: expect.any(Date),
          },
        },
        {
          new: true,
          sort: { createdAt: 1 },
        }
      );
      expect(result).toEqual(claimed);
    });

    it("should return null when there is no queued job", async () => {
      ImportJob.findOneAndUpdate.mockResolvedValue(null);

      const result = await claimNextImportJob();

      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  describe("updateImportJob", () => {
    it("should update the job with validators enabled", async () => {
      const updateData = { status: "COMPLETED", processedRows: 10 };
      const updated = { _id: "job1", ...updateData };
      ImportJob.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await updateImportJob("job1", updateData);

      expect(ImportJob.findByIdAndUpdate).toHaveBeenCalledWith(
        "job1",
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updated);
    });

    it("should throw 404 if the job does not exist", async () => {
      ImportJob.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        updateImportJob("missing", { status: "FAILED" })
      ).rejects.toThrow("Import job not found");
      expect(AppError).toHaveBeenCalledWith("Import job not found", 404);
    });
  });
});