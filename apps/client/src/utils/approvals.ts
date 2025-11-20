import type { PurchaseRequest, UserRole } from '../types';

export function canRoleApprove(request: PurchaseRequest, role?: UserRole | null): boolean {
  if (!role) return false;
  switch (role) {
    case 'head_of_department':
      return request.status === 'hod_review';
    case 'chief_finance_officer':
    case 'super_user':
      return request.status === 'cfo_review';
    case 'chief_executive_officer':
      return request.status === 'ceo_review';
    default:
      return false;
  }
}
