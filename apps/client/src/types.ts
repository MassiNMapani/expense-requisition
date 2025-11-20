import type { PurchaseRequestPayload } from '@expense-requisition/shared';

export type { UserRole, DocumentType, RequestStatus, LineItem, PurchaseRequest, AccountingStep } from '@expense-requisition/shared';

export type ClientPurchaseRequestDraft = PurchaseRequestPayload & {
  localFiles: File[];
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size?: number;
  }>;
  bankLetterFile: File | null;
  tpinCertificateFile: File | null;
};
