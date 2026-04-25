import { cloudinaryAdapter } from "./cloudinary";
import { firebaseAdapter } from "./firebase";
import { StorageAdapter, UploadImageBufferInput } from "./types";

const getStorageAdapter = (): StorageAdapter => {
  const service = process.env.IMAGE_STORAGE_SERVICE?.toLowerCase();

  switch (service) {
    case "cloudinary":
      return cloudinaryAdapter;
    case "firebase":
    default:
      return firebaseAdapter;
  }
};

const adapter = getStorageAdapter();

export const uploadImageBuffer = (input: UploadImageBufferInput): Promise<string> => {
  return adapter.uploadImageBuffer(input);
};

export { UploadImageBufferInput, StorageAdapter };
