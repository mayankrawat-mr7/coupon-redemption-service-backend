import mongoose from "mongoose";

const { Schema, model } = mongoose;

const importJobSchema = new Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "COMPLETED", "FAILED"],
      default: "QUEUED",
      index: true,
    },

    totalRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    processedRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    successfulRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    failedRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    rowErrors: [
      {
        row: {
          type: Number,
          min: 1,
        },
        message: {
          type: String,
          trim: true,
        },
      },
    ],

    filePath: {
      type: String,
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requestId: {
      type: String,
      trim: true,
    },

    startedAt: Date,

    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

importJobSchema.index({ status: 1, createdAt: 1 });

const ImportJob = model("ImportJob", importJobSchema);

export default ImportJob;