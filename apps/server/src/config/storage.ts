import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  }
});

export const uploadsPath = uploadsDir;
