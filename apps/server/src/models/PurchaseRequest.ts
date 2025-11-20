import { Schema, model, type Document } from 'mongoose';
import type { DocumentType, LineItem, RequestStatus, UserRole } from '@expense-requisition/shared';

export interface AccountingStepDocument {
  id: string;
  label: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}
export interface LineItemDocument extends LineItem {}

export interface PurchaseRequestDocument extends Document {
  requestNumber: string;
  projectName?: string;
  projectCode?: string;
  projectTechnology?: string;
  department: string;
  vendorType: string;
  currency: string;
  requesterId: string;
  requesterRole: UserRole;
  requestedAt: Date;
  serviceDescription: string;
  lineItems: LineItemDocument[];
  documentType: DocumentType;
  attachments: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }[];
  contractDetails?: {
    validFrom: string;
    validTo: string;
    paymentTerms: string;
  };
  status: RequestStatus;
  approvalHistory: {
    stage: RequestStatus;
    actorRole: UserRole;
    actorId: string;
    decision: 'approved' | 'rejected';
    comment?: string;
    actedAt: Date;
  }[];
  accountingSteps: AccountingStepDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<LineItemDocument>(
  {
    description: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true }
  },
  { _id: false }
);

const attachmentSchema = new Schema(
  {
    id: String,
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    storagePath: String
  },
  { _id: false }
);

const accountingStepSchema = new Schema<AccountingStepDocument>(
  {
    id: String,
    label: String,
    completed: { type: Boolean, default: false },
    completedBy: String,
    completedAt: Date
  },
  { _id: false }
);

const approvalHistorySchema = new Schema(
  {
    stage: String,
    actorRole: String,
    actorId: String,
    decision: String,
    comment: String,
    actedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const purchaseRequestSchema = new Schema<PurchaseRequestDocument>(
  {
    requestNumber: { type: String, required: true, unique: true },
    projectName: { type: String },
    projectCode: { type: String },
    projectTechnology: { type: String },
    department: { type: String, required: true },
    vendorType: { type: String, required: true, enum: ['existing', 'new'] },
    currency: { type: String, required: true, enum: ['ZMW', 'USD'] },
    requesterId: { type: String, required: true },
    requesterRole: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    serviceDescription: { type: String, required: true },
    lineItems: [lineItemSchema],
    documentType: { type: String, required: true },
    attachments: [attachmentSchema],
    contractDetails: {
      validFrom: String,
      validTo: String,
      paymentTerms: String
    },
    status: { type: String, required: true },
    approvalHistory: [approvalHistorySchema],
    accountingSteps: [accountingStepSchema]
  },
  { timestamps: true }
);

export const PurchaseRequestModel = model<PurchaseRequestDocument>('PurchaseRequest', purchaseRequestSchema);
