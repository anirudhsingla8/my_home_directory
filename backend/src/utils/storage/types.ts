export type UploadImageBufferInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
};

export interface StorageAdapter {
  uploadImageBuffer(input: UploadImageBufferInput): Promise<string>;
}
