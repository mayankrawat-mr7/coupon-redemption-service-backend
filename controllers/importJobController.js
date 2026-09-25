import fs from "fs-extra";

import { catchAsync } from "../utils/helpers.js";
import AppSuccess from "../middlewares/appSuccess.js";
import AppError from "../middlewares/appError.js";
import { logSuccess } from "../utils/logger.js";

import {
  createImportJob as createImportJobService,
  getImportJobById as getImportJobByIdService,
} from "../services/importJobService.js";

export const createImportJob = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError("CSV file is required", 400);
  }

  try {
    const importJob = await createImportJobService({
      fileName: req.file.originalname,
      filePath: req.file.path,
      createdBy: req.user.id,
      requestId: req.requestId,
    });
    logSuccess(req, "CSV import job queued", {
      actorId: req.user.id,
      jobId: importJob.id || importJob._id?.toString(),
    });

    return new AppSuccess(res, {
      statusCode: 202,
      message: "CSV import job queued successfully",
      data: importJob,
    });
  } catch (error) {
    await fs.remove(req.file.path);
    throw error;
  }
});

export const getImportJobById = catchAsync(async (req, res) => {
  const importJob = await getImportJobByIdService(req.params.id);

  return new AppSuccess(res, {
    message: "Import job status fetched successfully",
    data: importJob,
  });
});
