import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { FilterQuery } from 'mongoose';
import {
  DocumentTypes,
  RequestStatuses,
  Roles,
  accountingChecklistByDocument,
  departmentRequiresProjectDetails,
  Currencies,
  VendorTypes,
  type DocumentType,
  type RequestStatus,
  type UserRole
} from '@expense-requisition/shared';

import { PurchaseRequestModel } from '../models/PurchaseRequest';
import type { PurchaseRequestDocument } from '../models/PurchaseRequest';

function getInitialStatus(role: string): RequestStatus {
  switch (role) {
    case Roles.HOD:
      return RequestStatuses.CFO_REVIEW;
    case Roles.CFO:
      return RequestStatuses.CEO_REVIEW;
    case Roles.CEO:
      return RequestStatuses.ACCOUNTING;
    default:
      return RequestStatuses.HOD_REVIEW;
  }
}

function assertCanActOnRequest(role: string, status: RequestStatus): string | null {
  if (role === Roles.HOD && status !== RequestStatuses.HOD_REVIEW) return 'HOD can only review HOD queue';
  if ((role === Roles.CFO || role === Roles.SUPER_USER) && status !== RequestStatuses.CFO_REVIEW) {
    return 'CFOs review the CFO queue';
  }
  if (role === Roles.CEO && status !== RequestStatuses.CEO_REVIEW) return 'CEO can only review CEO queue';
  const accountingStatuses: RequestStatus[] = [RequestStatuses.ACCOUNTING, RequestStatuses.BANK_LOADED];
  if (role === Roles.ANALYST && !accountingStatuses.includes(status)) {
    return 'Analysts can only work on accounting stages';
  }
  return null;
}

function buildAccountingSteps(documentType: DocumentType) {
  const checklist = accountingChecklistByDocument[documentType] ?? [];
  return checklist.map((label) => ({
    id: uuidv4(),
    label,
    completed: false
  }));
}

export async function createRequest(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const {
      projectName,
      projectCode,
      projectTechnology,
      department,
      vendorType,
      serviceDescription,
      currency,
      lineItems: lineItemsRaw,
      documentType,
      contractDetails: contractDetailsRaw,
      requestDate
    } = req.body;

    if (!department || !vendorType || !currency || !serviceDescription || !lineItemsRaw || !documentType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!VendorTypes.includes(vendorType)) {
      return res.status(400).json({ message: 'Invalid vendor type' });
    }

    if (!Currencies.includes(currency)) {
      return res.status(400).json({ message: 'Invalid currency' });
    }

    const allowedDepartments: string[] = ['Generation and Transmission', 'Transmission and Distribution', 'Environment'];
    const enforcedDepartment = req.user.departmentId ?? department;

    if (req.user.role === Roles.REQUESTOR) {
      if (!req.user.departmentId) {
        return res.status(400).json({ message: 'Requestor department not configured' });
      }

      if (!allowedDepartments.includes(req.user.departmentId)) {
        return res.status(400).json({ message: 'Requestors can only submit from allowed departments' });
      }
    }

    const requiresProjectDetails = departmentRequiresProjectDetails(enforcedDepartment);

    if (requiresProjectDetails && (!projectName || !projectCode || !projectTechnology)) {
      return res.status(400).json({ message: 'Project details are required for this department' });
    }

    let parsedLineItems: { description: string; unitPrice: number; quantity: number }[];

    if (typeof lineItemsRaw === 'string') {
      try {
        parsedLineItems = JSON.parse(lineItemsRaw);
      } catch (error) {
        return res.status(400).json({ message: 'Unable to read line items payload' });
      }
    } else if (Array.isArray(lineItemsRaw)) {
      parsedLineItems = lineItemsRaw;
    } else {
      return res.status(400).json({ message: 'Line items are required' });
    }

    if (!Array.isArray(parsedLineItems) || parsedLineItems.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }

    if (!Object.values(DocumentTypes).includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const typedDocumentType = documentType as DocumentType;

    const normalizedLineItems = parsedLineItems.map((item: { description: string; unitPrice: number; quantity: number }) => ({
      description: item.description,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity)
    }));

    if (
      normalizedLineItems.some(
        (item) =>
          !item.description ||
          Number.isNaN(item.unitPrice) ||
          Number.isNaN(item.quantity) ||
          item.unitPrice < 0 ||
          item.quantity < 0
      )
    ) {
      return res.status(400).json({ message: 'Invalid line item values. Unit price and quantity cannot be negative.' });
    }

    const parsedContract = contractDetailsRaw ? JSON.parse(contractDetailsRaw) : undefined;

    const files = (req.files as Express.Multer.File[]) ?? [];

    const attachments = files.map((file) => ({
      id: uuidv4(),
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: file.path
    }));

    const initialStatus = getInitialStatus(req.user.role);

    const projectDetails = requiresProjectDetails
      ? {
          projectName: projectName as string,
          projectCode: projectCode as string,
          projectTechnology: projectTechnology as string
        }
      : {};

    const request = await PurchaseRequestModel.create({
      ...projectDetails,
      department: enforcedDepartment,
      vendorType,
      currency,
      requesterId: req.user.id,
      requesterRole: req.user.role,
      requestedAt: requestDate ? new Date(requestDate) : new Date(),
      serviceDescription,
      lineItems: normalizedLineItems,
      documentType: typedDocumentType,
      attachments,
      contractDetails: parsedContract,
      status: initialStatus,
      approvalHistory: [
        {
          stage: RequestStatuses.SUBMITTED,
          actorRole: req.user.role,
          actorId: req.user.id,
          decision: 'approved',
          comment: 'Submitted',
          actedAt: new Date()
        }
      ],
      accountingSteps: buildAccountingSteps(typedDocumentType)
    });

    return res.status(201).json(request);
  } catch (error) {
    return res.status(400).json({ message: 'Failed to create request', details: error instanceof Error ? error.message : error });
  }
}

export async function listRequests(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const query: FilterQuery<PurchaseRequestDocument> = {};

  switch (req.user.role) {
    case Roles.REQUESTOR:
      query.requesterId = req.user.id;
      if (req.user.departmentId) {
        query.department = req.user.departmentId;
      }
      break;
    case Roles.HOD:
      if (req.user.departmentId) {
        query.department = req.user.departmentId;
      }
      break;
    case Roles.ANALYST:
      query.status = { $in: [RequestStatuses.ACCOUNTING, RequestStatuses.BANK_LOADED] };
      break;
    default:
      break;
  }

  const requests = await PurchaseRequestModel.find(query).sort({ createdAt: -1 });
  return res.json(requests);
}

export async function getRequest(req: Request, res: Response) {
  const record = await PurchaseRequestModel.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ message: 'Request not found' });
  }
  return res.json(record);
}

export async function updateRequestStatus(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { decision, comment, completedSteps } = req.body as {
    decision?: 'approved' | 'rejected';
    comment?: string;
    completedSteps?: string[];
  };

  const record = await PurchaseRequestModel.findById(req.params.id);

  if (!record) {
    return res.status(404).json({ message: 'Request not found' });
  }

  const validationError = assertCanActOnRequest(req.user.role, record.status as RequestStatus);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (req.user.role === Roles.ANALYST) {
    const set = new Set(completedSteps ?? []);
    record.accountingSteps = record.accountingSteps.map((step) => {
      if (set.has(step.id)) {
        const updatedStep = {
          ...step,
          completed: true,
          completedAt: new Date()
        };
        if (req.user?.id) {
          (updatedStep as typeof updatedStep & { completedBy: string }).completedBy = req.user.id;
        }
        return updatedStep;
      }
      return step;
    });

    record.status = record.accountingSteps.every((step) => step.completed)
      ? RequestStatuses.BANK_LOADED
      : RequestStatuses.ACCOUNTING;

    const analystHistory: {
      stage: RequestStatus;
      actorRole: UserRole;
      actorId: string;
      decision: 'approved' | 'rejected';
      actedAt: Date;
      comment?: string;
    } = {
      stage: RequestStatuses.ACCOUNTING,
      actorRole: req.user.role,
      actorId: req.user.id,
      decision: 'approved',
      actedAt: new Date()
    };

    if (comment) {
      analystHistory.comment = comment;
    }

    record.approvalHistory.push(analystHistory);

    await record.save();

    return res.json(record);
  }

  if (!decision) {
    return res.status(400).json({ message: 'Decision is required' });
  }

  const currentStage = record.status as RequestStatus;
  let nextStatus: RequestStatus = currentStage;

  if (decision === 'rejected') {
    if (!comment) {
      return res.status(400).json({ message: 'Comment is required when rejecting a request' });
    }
    nextStatus = RequestStatuses.REJECTED;
  } else {
    switch (req.user.role) {
      case Roles.HOD:
        nextStatus = RequestStatuses.CFO_REVIEW;
        break;
      case Roles.CFO:
      case Roles.SUPER_USER:
        nextStatus = RequestStatuses.CEO_REVIEW;
        break;
      case Roles.CEO:
        nextStatus = RequestStatuses.ACCOUNTING;
        break;
      default:
        break;
    }
  }

  record.status = nextStatus;

  const historyEntry: {
    stage: RequestStatus;
    actorRole: UserRole;
    actorId: string;
    decision: 'approved' | 'rejected';
    actedAt: Date;
    comment?: string;
  } = {
    stage: currentStage,
    actorRole: req.user.role,
    actorId: req.user.id,
    decision,
    actedAt: new Date()
  };

  if (comment) {
    historyEntry.comment = comment;
  }

  record.approvalHistory.push(historyEntry);

  await record.save();

  return res.json(record);
}
