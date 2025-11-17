import { Router } from 'express';

import { Roles } from '../constants/roles';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { upload } from '../config/storage';
import { createRequest, getRequest, listRequests, updateRequestStatus } from '../controllers/request.controller';

const router = Router();

router.use(authenticate);

router.post('/', authorize([Roles.REQUESTOR, Roles.HOD, Roles.CFO, Roles.CEO]), upload.array('attachments'), createRequest);

router.get('/', authorize([Roles.REQUESTOR, Roles.HOD, Roles.CFO, Roles.CEO, Roles.SUPER_USER, Roles.ANALYST]), listRequests);

router.get('/:id', authorize([Roles.REQUESTOR, Roles.HOD, Roles.CFO, Roles.CEO, Roles.SUPER_USER, Roles.ANALYST]), getRequest);

router.patch('/:id/status', authorize([Roles.HOD, Roles.CFO, Roles.CEO, Roles.SUPER_USER, Roles.ANALYST]), updateRequestStatus);

export default router;
