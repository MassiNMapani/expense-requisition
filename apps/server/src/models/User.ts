import { Schema, model, type Document } from 'mongoose';
import type { UserRole } from '@expense-requisition/shared';

export interface UserDocument extends Document {
  name: string;
  employeeId: string;
  email: string;
  departmentId?: string;
  role: UserRole;
  passwordHash: string;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    employeeId: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true },
    departmentId: { type: String },
    role: { type: String, required: true },
    passwordHash: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const UserModel = model<UserDocument>('User', userSchema);
