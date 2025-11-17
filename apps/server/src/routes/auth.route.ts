import { Router } from 'express';

import { authenticate } from '../middleware/auth';
import { changePassword, login } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/change-password', authenticate, changePassword);

export default router;
