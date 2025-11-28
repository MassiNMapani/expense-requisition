import { Router } from 'express';

import healthRouter from './health.route';
import requestRouter from './request.route';
import authRouter from './auth.route';
import uploadRouter from './upload.route';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/requests', requestRouter);
router.use('/uploads', uploadRouter);

export default router;
