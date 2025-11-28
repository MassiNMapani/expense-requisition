import type {
  PurchaseRequest as SharedPurchaseRequest,
  PurchaseRequestPayload,
  UserRole,
  DocumentType,
  RequestStatus,
  LineItem,
  AccountingStep
} from '@expense-requisition/shared';

export type PurchaseRequest = SharedPurchaseRequest & {
  loadedByAnalystId?: string;
  loadedByAnalystName?: string;
};

export type { UserRole, DocumentType, RequestStatus, LineItem, AccountingStep };

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
