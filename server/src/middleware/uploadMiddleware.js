import multer from 'multer';

// Use memoryStorage so image buffer is processed in memory via Sharp without writing to server disk
const storage = multer.memoryStorage();

// Flexible MIME and extension filter for all image types
const fileFilter = (req, file, cb) => {
  // Accept any standard image MIME or common image extensions
  const isImageMime = file.mimetype && file.mimetype.startsWith('image/');
  const isImageExt = /\.(jpg|jpeg|png|webp|heic|heif|avif|tiff|bmp|gif)$/i.test(file.originalname);

  if (isImageMime || isImageExt) {
    return cb(null, true);
  }

  const error = new Error('Invalid file format. Please upload a valid image file.');
  error.statusCode = 400;
  cb(error, false);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB maximum file size
  },
  fileFilter,
});

export const uploadSingleImage = upload.single('image');
