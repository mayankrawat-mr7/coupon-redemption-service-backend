import "dotenv/config";
import fs from "fs-extra";
import { parse } from "csv-parse/sync";

import { connectDB } from "../config/config.js";
import Coupon from "../models/couponModel.js";
import { createCouponSchema } from "../utils/validationSchemas/couponSchema.js";
import {
  claimNextImportJob,
  updateImportJob,
} from "../services/importJobService.js";

const POLL_INTERVAL = 2000;

const processImportJob = async (job) => {
  try {
    const csvContent = await fs.readFile(job.filePath, "utf-8");

    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    await updateImportJob(job._id, {
      totalRows: rows.length,
    });

    let successfulRows = 0;
    let failedRows = 0;
    const rowErrors = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        const { error, value } = createCouponSchema.validate(row, {
          abortEarly: false,
          convert: true,
        });

        if (error) {
          throw new Error(
            error.details
              .map((detail) => detail.message)
              .join(", ")
          );
        }

        await Coupon.create({
          ...value,
          code: value.code.toUpperCase(),
        });

        successfulRows++;
      } catch (error) {
        failedRows++;

        rowErrors.push({
          row: rowNumber,
          message:
            error.code === 11000
              ? "Coupon code already exists"
              : error.message,
        });
      }

      await updateImportJob(job._id, {
        processedRows: index + 1,
        successfulRows,
        failedRows,
        rowErrors,
      });
    }

    await updateImportJob(job._id, {
      status: "COMPLETED",
      processedRows: rows.length,
      successfulRows,
      failedRows,
      rowErrors,
      completedAt: new Date(),
    });

    await fs.remove(job.filePath);

    console.log(
      `Import job ${job._id} completed: ${successfulRows} successful, ${failedRows} failed`
    );
  } catch (error) {
    console.error(`Import job ${job._id} failed:`, error);

    await updateImportJob(job._id, {
      status: "FAILED",
      completedAt: new Date(),
      rowErrors: [
        {
          row: 0,
          message: error.message,
        },
      ],
    });

    await fs.remove(job.filePath).catch(() => {});
  }
};

const startWorker = async () => {
  await connectDB();

  console.log("Coupon import worker started");

  while (true) {
    try {
      const job = await claimNextImportJob();

      if (job) {
        console.log(`Processing import job: ${job._id}`);

        await processImportJob(job);
      } else {
        await new Promise((resolve) =>
          setTimeout(resolve, POLL_INTERVAL)
        );
      }
    } catch (error) {
      console.error("Worker error:", error);

      await new Promise((resolve) =>
        setTimeout(resolve, POLL_INTERVAL)
      );
    }
  }
};

startWorker();