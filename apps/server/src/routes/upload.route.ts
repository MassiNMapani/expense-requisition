import path from 'node:path';
import fs from 'node:fs';
import { Router } from 'express';

import { uploadsPath } from '../config/storage';
import { authenticate } from '../middleware/auth';
import { Roles } from '../constants/roles';

const router = Router();

router.use(authenticate);

router.get('/:filename', async (req, res) => {
  const { filename } = req.params;
  const wantsDownload = req.query.download === 'true';
  const downloadAllowed = req.user?.role === Roles.ANALYST || req.user?.role === Roles.CFO;

  if (wantsDownload && !downloadAllowed) {
    return res.status(403).json({ message: 'Download not permitted for this role' });
  }

  const safeName = path.basename(filename);
  const filePath = path.resolve(uploadsPath, safeName);

  if (!filePath.startsWith(path.resolve(uploadsPath))) {
    return res.status(400).json({ message: 'Invalid file path' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.type(safeName);
  res.setHeader('Content-Disposition', wantsDownload ? `attachment; filename="${safeName}"` : `inline; filename="${safeName}"`);

  return res.sendFile(filePath);
});

export default router;
