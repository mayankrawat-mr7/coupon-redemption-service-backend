import multer from "multer";
import path from "path";
import fs from "fs-extra";

const uploadDirectory = path.join(process.cwd(), "uploads", "imports");

fs.ensureDirSync(uploadDirectory);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension !== ".csv") {
    return cb(new Error("Only CSV files are allowed"));
  }

  cb(null, true);
};

export const uploadCsv = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});