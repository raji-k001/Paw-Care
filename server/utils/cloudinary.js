import { v2 as cloudinary } from "cloudinary";

// Configured inside a function so it runs after dotenv has loaded .env
const configure = () =>
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

export const uploadToCloudinary = (buffer, folder = "pawcare/pets") => {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) =>
      error ? reject(error) : resolve({ url: result.secure_url, public_id: result.public_id })
    );
    stream.end(buffer);
  });
};

export const deleteFromCloudinary = (publicId) => {
  configure();
  return cloudinary.uploader.destroy(publicId);
};