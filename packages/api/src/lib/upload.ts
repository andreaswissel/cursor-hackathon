import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";

// Configurable upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed video MIME types
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
];

// 500MB size limit
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    cb(null, filename);
  },
});

// File filter for video types
const videoFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: mp4, webm, mov, avi`));
  }
};

// Create multer instance for video uploads
export const videoUpload = multer({
  storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Helper to get the full path of an uploaded file
export function getUploadPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}

// Helper to delete an uploaded file
export async function deleteUploadedFile(filename: string): Promise<void> {
  const filePath = getUploadPath(filename);
  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
}

// Export config for reference
export const uploadConfig = {
  uploadDir: UPLOAD_DIR,
  allowedTypes: ALLOWED_VIDEO_TYPES,
  maxFileSize: MAX_FILE_SIZE,
};
