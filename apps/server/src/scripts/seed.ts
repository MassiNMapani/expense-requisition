import { connectDatabase } from '../lib/db';
import { UserModel } from '../models/User';
import { hashPassword } from '../utils/password';
import { Roles } from '../constants/roles';
import { logger } from '../lib/logger';

async function seed() {
  await connectDatabase();

  const defaultPassword = await hashPassword('Password#1');

  const users = [
    {
      name: 'Massi Mapani',
      employeeId: 'KAN001',
      email: 'massi.mapani@example.com',
      departmentId: 'Environment',
      role: Roles.REQUESTOR
    },
    {
      name: 'Head of Environment',
      employeeId: 'KAN100',
      email: 'hod.environment@example.com',
      departmentId: 'Environment',
      role: Roles.HOD
    },
    {
      name: 'Pia Mansukhani',
      employeeId: 'CFO001',
      email: 'cfo@example.com',
      role: Roles.CFO
    },
    {
      name: 'Tanda Syamunyangwa',
      employeeId: 'CEO001',
      email: 'ceo@example.com',
      role: Roles.CEO
    },
    {
      name: 'Finance Analyst',
      employeeId: 'ANL001',
      email: 'analyst@example.com',
      role: Roles.ANALYST
    }
  ];

  for (const user of users) {
    await UserModel.findOneAndUpdate(
      { employeeId: user.employeeId },
      { ...user, passwordHash: defaultPassword, mustChangePassword: true },
      { upsert: true }
    );
  }

  logger.info('Seeded default users with password Password#1');
  process.exit(0);
}

seed().catch((error) => {
  logger.error('Failed to seed users', error);
  process.exit(1);
});
