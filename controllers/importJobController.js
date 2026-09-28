import { catchAsync } from "../utils/helpers.js";
import AppSuccess from "../middlewares/appSuccess.js";
import AppError from "../middlewares/appError.js";
import { logSuccess } from "../utils/logger.js";

import {
  createImportJob as createImportJobService,
  getImportJobById as getImportJobByIdService,
  processImportJob,
  storeImportFile,
} from "../services/importJobService.js";

export const createImportJob = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError("CSV file is required", 400);
  }

  const fileId = await storeImportFile({
    buffer: req.file.buffer,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
  });
  const importJob = await createImportJobService({
    fileName: req.file.originalname,
    fileId,
    createdBy: req.user.id,
    requestId: req.requestId,
  });
  const completedJob = await processImportJob(importJob);
  logSuccess(req, "CSV import completed", {
    actorId: req.user.id,
    jobId: importJob.id || importJob._id?.toString(),
  });

  return new AppSuccess(res, {
    statusCode: 201,
    message: "CSV import completed",
    data: completedJob,
  });
});

export const getImportJobById = catchAsync(async (req, res) => {
  const importJob = await getImportJobByIdService(req.params.id);

  return new AppSuccess(res, {
    message: "Import job status fetched successfully",
    data: importJob,
  });
});
