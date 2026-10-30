import multer from "multer";

const storage = multer.memoryStorage();
const limits = { fileSize: 5 * 1024 * 1024 }; // 5 MB per file

// Pet photos: images only
const upload = multer({
  storage,
  limits,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// Application documents: images or PDF
export const uploadDocs = multer({
  storage,
  limits,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only images or PDF files are allowed"));
  },
});

export default upload;