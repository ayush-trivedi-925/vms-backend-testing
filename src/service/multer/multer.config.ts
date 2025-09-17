import { memoryStorage } from 'multer';

export const multerConfig = {
  storage: memoryStorage(), //stores in memory buffer
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
};
