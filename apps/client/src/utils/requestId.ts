import type { PurchaseRequest } from '../types';

export type ExtendedPurchaseRequest = PurchaseRequest & { _id?: string };

export function getRequestObjectId(request: ExtendedPurchaseRequest): string {
  return request.id ?? request._id ?? '';
}
