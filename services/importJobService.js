import ImportJob from "../models/importJobModel.js";
import AppError from "../middlewares/appError.js";
import mongoose from "mongoose";
import { parse } from "csv-parse/sync";
import Coupon from "../models/couponModel.js";
import { createCouponSchema } from "../utils/validationSchemas/couponSchema.js";

const getBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
  bucketName: "couponImports",
});

export const storeImportFile = ({ buffer, fileName, mimeType }) =>
  new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(fileName, {
      contentType: mimeType || "text/csv",
    });
    uploadStream.once("error", reject);
    uploadStream.once("finish", () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });

const readImportFile = (fileId) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const downloadStream = getBucket().openDownloadStream(fileId);
    downloadStream.on("data", (chunk) => chunks.push(chunk));
    downloadStream.once("error", reject);
    downloadStream.once("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });

export const createImportJob = async ({
  fileName,
  fileId,
  createdBy,
  requestId,
}) => {
  const importJob = await ImportJob.create({
    fileName,
    fileId,
    createdBy,
    requestId,
    status: "PROCESSING",
  });

  return importJob;
};

export const getImportJobById = async (jobId) => {
  const importJob = await ImportJob.findById(jobId).select(
    "-fileId"
  );

  if (!importJob) {
    throw new AppError("Import job not found", 404);
  }

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

export const processImportJob = async (importJob) => {
  await updateImportJob(importJob._id, { startedAt: new Date() });

  try {
    const csvContent = await readImportFile(importJob.fileId);
    const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    let successfulRows = 0;
    let failedRows = 0;
    const rowErrors = [];

    for (let index = 0; index < rows.length; index += 1) {
      try {
        const { error, value } = createCouponSchema.validate(rows[index], { abortEarly: false, convert: true });
        if (error) throw new Error(error.details.map((detail) => detail.message).join(", "));
        await Coupon.create({ ...value, code: value.code.toUpperCase() });
        successfulRows += 1;
      } catch (error) {
        failedRows += 1;
        rowErrors.push({ row: index + 2, message: error.code === 11000 ? "Coupon code already exists" : error.message });
      }
    }

    return updateImportJob(importJob._id, {
      status: "COMPLETED", totalRows: rows.length, processedRows: rows.length,
      successfulRows, failedRows, rowErrors, completedAt: new Date(),
    });
  } catch (error) {
    return updateImportJob(importJob._id, {
      status: "FAILED", completedAt: new Date(), rowErrors: [{ row: 0, message: error.message }],
    });
  }
};
