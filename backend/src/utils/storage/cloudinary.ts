import { v2 as cloudinary } from "cloudinary";

import { UploadImageBufferInput, StorageAdapter } from "./types";

export const uploadImageBuffer = async ({
  buffer,
  originalName,
  mimeType,
  folder = "items"
}: UploadImageBufferInput): Promise<string> => {
  // Ensure Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are not configured.");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.IMAGE_STORAGE_FOLDER || folder,
        resource_type: "auto"
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }
        if (!result) {
          return reject(new Error("Cloudinary upload failed: No result returned"));
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
};

export const cloudinaryAdapter: StorageAdapter = {
  uploadImageBuffer
};
