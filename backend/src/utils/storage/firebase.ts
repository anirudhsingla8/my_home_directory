import { randomUUID } from "crypto";
import path from "path";

import admin from "firebase-admin";

import { UploadImageBufferInput, StorageAdapter } from "./types";

const encodeStoragePath = (value: string): string =>
  value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const sanitizeFileName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const getServiceAccount = (): admin.ServiceAccount => {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!rawServiceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured.");
  }

  const parsedServiceAccount = JSON.parse(rawServiceAccount) as admin.ServiceAccount & {
    privateKey?: string;
  };

  if (parsedServiceAccount.privateKey) {
    parsedServiceAccount.privateKey = parsedServiceAccount.privateKey.replace(/\\n/g, "\n");
  }

  return parsedServiceAccount;
};

const getFirebaseApp = (): admin.app.App => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!storageBucket) {
    throw new Error("FIREBASE_STORAGE_BUCKET is not configured.");
  }

  return admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
    storageBucket
  });
};

export const uploadImageBuffer = async ({
  buffer,
  originalName,
  mimeType,
  folder = "items"
}: UploadImageBufferInput): Promise<string> => {
  const app = getFirebaseApp();
  const bucket = admin.storage(app).bucket();

  const extension = path.extname(originalName) || ".jpg";
  const baseName = path.basename(originalName, extension);
  const safeBaseName = sanitizeFileName(baseName) || "image";
  const targetFolder = process.env.IMAGE_STORAGE_FOLDER || folder;
  const filePath = `${targetFolder}/${randomUUID()}-${safeBaseName}${extension}`;
  const file = bucket.file(filePath);

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: mimeType,
      cacheControl: "public, max-age=31536000"
    }
  });

  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${encodeStoragePath(filePath)}`;
};

export const firebaseAdapter: StorageAdapter = {
  uploadImageBuffer
};
