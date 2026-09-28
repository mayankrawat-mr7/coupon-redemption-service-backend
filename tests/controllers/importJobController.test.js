import { jest } from "@jest/globals";

// ---- Mocks -------------------------------------------------------------

jest.unstable_mockModule("fs-extra", () => ({
  default: { remove: jest.fn() },
}));

jest.unstable_mockModule("../../utils/helpers.js", () => ({
  catchAsync: jest.fn((fn) => async (req, res, next) => {
    return await fn(req, res, next);
  }),
}));

jest.unstable_mockModule("../../middlewares/appSuccess.js", () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule("../../middlewares/appError.js", () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule("../../utils/logger.js", () => ({
  logSuccess: jest.fn(),
}));

jest.unstable_mockModule("../../services/importJobService.js", () => ({
  createImportJob: jest.fn(),
  getImportJobById: jest.fn(),
}));

// ---- Imports (after mocking) -------------------------------------------

const fs = (await import("fs-extra")).default;
const AppSuccess = (await import("../../middlewares/appSuccess.js")).default;
const AppError = (await import("../../middlewares/appError.js")).default;
const { logSuccess } = await import("../../utils/logger.js");
const { createImportJob: createImportJobService, getImportJobById: getImportJobByIdService } =
  await import("../../services/importJobService.js");
const { createImportJob, getImportJobById } = await import(
  "../../controllers/importJobController.js"
);

describe("ImportJobController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    AppError.mockImplementation((message, code) => {
      const error = new Error(message);
      error.statusCode = code;
      return error;
    });

    req = {
      body: {},
      params: {},
      requestId: "req-1",
      user: { id: "admin1" },
      file: {
        originalname: "coupons.csv",
        path: "uploads/coupons.csv",
      },
    };
    res = {};
  });

  describe("createImportJob", () => {
    it("should throw 400 if no file was uploaded", async () => {
      req.file = undefined;

      await expect(createImportJob(req, res)).rejects.toThrow(
        "CSV file is required"
      );

      expect(AppError).toHaveBeenCalledWith("CSV file is required", 400);
      expect(createImportJobService).not.toHaveBeenCalled();
    });

    it("should queue the job and respond with 202", async () => {
      const importJob = { _id: "job1", id: "job1", status: "QUEUED" };
      createImportJobService.mockResolvedValue(importJob);

      await createImportJob(req, res);

      expect(createImportJobService).toHaveBeenCalledWith({
        fileName: "coupons.csv",
        filePath: "uploads/coupons.csv",
        createdBy: "admin1",
        requestId: "req-1",
      });
      expect(logSuccess).toHaveBeenCalledWith(req, "CSV import job queued", {
        actorId: "admin1",
        jobId: "job1",
      });
      expect(AppSuccess).toHaveBeenCalledWith(res, {
        statusCode: 202,
        message: "CSV import job queued successfully",
        data: importJob,
      });
      expect(fs.remove).not.toHaveBeenCalled();
    });

    it("should fall back to _id when the job has no id getter", async () => {
      const importJob = {
        _id: { toString: () => "job-from-objectid" },
        status: "QUEUED",
      };
      createImportJobService.mockResolvedValue(importJob);

      await createImportJob(req, res);

      expect(logSuccess).toHaveBeenCalledWith(
        req,
        "CSV import job queued",
        expect.objectContaining({ jobId: "job-from-objectid" })
      );
    });

    it("should delete the uploaded file and rethrow if queuing fails", async () => {
      const failure = new Error("db down");
      createImportJobService.mockRejectedValue(failure);
      fs.remove.mockResolvedValue();

      await expect(createImportJob(req, res)).rejects.toThrow("db down");

      expect(fs.remove).toHaveBeenCalledWith("uploads/coupons.csv");
      expect(AppSuccess).not.toHaveBeenCalled();
    });
  });

  describe("getImportJobById", () => {
    it("should return the job status", async () => {
      const importJob = { _id: "job1", status: "PROCESSING" };
      req.params = { id: "job1" };
      getImportJobByIdService.mockResolvedValue(importJob);

      await getImportJobById(req, res);

      expect(getImportJobByIdService).toHaveBeenCalledWith("job1");
      expect(AppSuccess).toHaveBeenCalledWith(res, {
        message: "Import job status fetched successfully",
        data: importJob,
      });
    });
  });
});