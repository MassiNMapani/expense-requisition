import { Router } from 'express';

import healthRouter from './health.route';
import requestRouter from './request.route';
import authRouter from './auth.route';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/requests', requestRouter);

export default router;
