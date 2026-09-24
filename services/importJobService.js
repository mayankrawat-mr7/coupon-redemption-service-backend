import ImportJob from "../models/importJobModel.js";
import AppError from "../middlewares/appError.js";

export const createImportJob = async ({
  fileName,
  filePath,
  createdBy,
  requestId,
}) => {
  const importJob = await ImportJob.create({
    fileName,
    filePath,
    createdBy,
    requestId,
    status: "QUEUED",
  });

  return importJob;
};

export const getImportJobById = async (jobId) => {
  const importJob = await ImportJob.findById(jobId).select(
    "-filePath"
  );

  if (!importJob) {
    throw new AppError("Import job not found", 404);
  }

  return importJob;
};

/**
 * Atomically claims one queued job.
 * Only one worker/process can successfully claim the same job.
 */
export const claimNextImportJob = async () => {
  const importJob = await ImportJob.findOneAndUpdate(
    {
      status: "QUEUED",
    },
    {
      $set: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    },
    {
      new: true,
      sort: {
        createdAt: 1,
      },
    }
  );

  return importJob;
};

export const updateImportJob = async (jobId, updateData) => {
  const importJob = await ImportJob.findByIdAndUpdate(
    jobId,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!importJob) {
    throw new AppError("Import job not found", 404);
  }

  return importJob;
};