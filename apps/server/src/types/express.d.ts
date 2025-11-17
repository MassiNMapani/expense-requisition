import type { UserRole } from '../constants/roles';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        departmentId?: string;
      };
    }
  }
}

export {};
