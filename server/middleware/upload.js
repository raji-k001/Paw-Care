import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(), // keep the file in memory, then send it to Cloudinary
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

export default upload;