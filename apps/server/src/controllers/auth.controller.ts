import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import env from '../config/env';
import { UserModel } from '../models/User';
import { comparePassword, hashPassword } from '../utils/password';
import { logger } from '../lib/logger';

export async function login(req: Request, res: Response) {
  const { employeeId, password } = req.body as { employeeId?: string; password?: string };

  if (!employeeId || !password) {
    return res.status(400).json({ message: 'Employee ID and password are required' });
  }

  const user = await UserModel.findOne({ employeeId });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId
    },
    env.jwtSecret,
    { expiresIn: '8h', subject: user.id }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      employeeId: user.employeeId,
      role: user.role,
      departmentId: user.departmentId
    },
    requiresPasswordChange: user.mustChangePassword
  });
}

export async function changePassword(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!newPassword) {
    return res.status(400).json({ message: 'New password required' });
  }

  const user = await UserModel.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!currentPassword) {
    return res.status(400).json({ message: 'Current password required' });
  }

  const isValid = await comparePassword(currentPassword, user.passwordHash);

  if (!isValid) {
    return res.status(400).json({ message: 'Current password incorrect' });
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  logger.info(`User ${user.employeeId} updated password`);

  return res.json({ message: 'Password updated' });
}
