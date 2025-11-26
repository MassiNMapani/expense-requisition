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
      name: 'Munsanda Muleya',
      employeeId: 'KAN005',
      email: 'munsanda@kanonapower.com',
      departmentId: 'Commercial',
      role: Roles.REQUESTOR
    },
    {
      name: 'Laura Mwandemena',
      employeeId: 'KAN010',
      email: 'laura@kanonapower.com',
      departmentId: 'Finance',
      role: Roles.ANALYST
    },
    {
      name: 'Nsofwa Sikanyika',
      employeeId: 'KAN015',
      email: 'nsofwa@kanonapower.com',
      departmentId: 'Commercial',
      role: Roles.HOD
    },
    {
      name: 'Munakupya Muyunda',
      employeeId: 'KAN016',
      email: 'munakupya@kanonapower.com',
      departmentId: 'Commercial',
      role: Roles.REQUESTOR
    },
    {
      name: 'Makoye Mapani',
      employeeId: 'KAN017',
      email: 'makoye@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.REQUESTOR
    },
    {
      name: 'Mwenya Kaliwile',
      employeeId: 'KAN018',
      email: 'mwenya@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.HOD
    },
    {
      name: 'Stembeni Nindi',
      employeeId: 'KAN019',
      email: 'stembeni@kanonapower.com',
      departmentId: 'Legal',
      role: Roles.REQUESTOR
    },
    {
      name: 'Katongo Makala',
      employeeId: 'KAN020',
      email: 'bkatongo@kanonapower.com',
      departmentId: 'Commercial',
      role: Roles.REQUESTOR
    },
    {
      name: 'Mwiza Tembo',
      employeeId: 'KAN022',
      email: 'mwiza@kanonapower.com',
      departmentId: 'Commercial',
      role: Roles.REQUESTOR
    },
    {
      name: 'John Simachembele',
      employeeId: 'KAN025',
      email: 'john@kanonapower.com',
      departmentId: 'Human Resource and Adminstration',
      role: Roles.HOD
    },
    {
      name: 'John Simachembele',
      employeeId: 'KAN025',
      email: 'john@kanonapower.com',
      departmentId: 'Human Resource and Adminstration',
      role: Roles.HOD
    },
    {
      name: 'Beenzu Mapani',
      employeeId: 'KAN011',
      email: 'beenzu@kanonapower.com',
      departmentId: 'Legal',
      role: Roles.HOD
    },
    {
      name: 'Eric Phiri',
      employeeId: 'KAN012',
      email: 'eric@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.HOD
    },
    {
      name: 'Monica Musonda',
      employeeId: 'KAN013',
      email: 'monica@kanonapower.com',
      role: Roles.CEO
    },
    {
      name: 'Russell Harawa',
      employeeId: 'KAN014',
      email: 'russell@kanonapower.com',
      role: Roles.CEO
    },
    {
      name: 'Padmore Muleya',
      employeeId: 'KAN004',
      email: 'padmore@kanonapower.com',
      role: Roles.CEO
    },
    {
      name: 'Nicole Chongo',
      employeeId: 'KAN026',
      email: 'nicole@kanonapower.com',
      departmentId: 'Commercial',
      role: Roles.REQUESTOR
    },
    {
      name: 'Barron Syamwalu',
      employeeId: 'KAN029',
      email: 'barron@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.REQUESTOR
    },
    {
      name: 'Jonathan. Kayombo',
      employeeId: 'KAN030',
      email: 'jonathan@kanonapower.com',
      departmentId: 'IT',
      role: Roles.REQUESTOR
    },
    {
      name: 'Milner Mutonga',
      employeeId: 'KAN031',
      email: 'milner@kanonapower.com',
      departmentId: 'Human Resource and Adminstration',
      role: Roles.CEO
    },
    {
      name: 'Karim Jussa',
      employeeId: 'KAN032',
      email: 'karim@kanonapower.com',
      departmentId: 'Human Resource and Adminstration',
      role: Roles.REQUESTOR
    },
    {
      name: 'Bodrick Mwansa',
      employeeId: 'KAN033',
      email: 'bodrick@kanonapower.com',
      departmentId: 'Commercial',
      role: Roles.REQUESTOR
    },
    {
      name: 'Worries Sinkala',
      employeeId: 'KAN034',
      email: 'worries@kanonapower.com',
      departmentId: 'Environment',
      role: Roles.HOD
    },
    {
      name: 'Niza Nambela',
      employeeId: 'KAN035',
      email: 'niza@kanonapower.com',
      departmentId: 'Human Resource and Adminstration',
      role: Roles.REQUESTOR
    },
    {
      name: 'Percy Chisanga',
      employeeId: 'KAN036',
      email: 'percy@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.REQUESTOR
    },
    {
      name: 'Choolwe Nalubamba',
      employeeId: 'KAN037',
      email: 'choolwe@kanonapower.com',
      departmentId: 'IT',
      role: Roles.HOD
    },
    {
      name: 'Massi Mapani',
      employeeId: 'KAN039',
      email: 'massi@kanonapower.com',
      departmentId: 'IT',
      role: Roles.REQUESTOR
    },
    {
      name: 'Natasha Njobvu-Chirwa',
      employeeId: 'KAN041',
      email: 'natashac@kanonapower.com',
      departmentId: 'Legal',
      role: Roles.REQUESTOR
    },
    {
      name: 'Pia Mansukhani',
      employeeId: 'KAN003',
      email: 'pia@kanonapower.com',
      departmentId: 'Finance',
      role: Roles.CFO
    },
    {
      name: 'Tito Mwandemena',
      employeeId: 'KAN042',
      email: 'tito@kanonapower.com',
      departmentId: 'Legal',
      role: Roles.REQUESTOR
    },
    {
      name: 'Shashank Gautum',
      employeeId: 'KAN043',
      email: 'shashankg@kanonapower.com',
      departmentId: 'Finance',
      role: Roles.ANALYST
    },
    {
      name: 'Kabwe Malema',
      employeeId: 'KAN044',
      email: 'kabwem@kanonapower.com',
      departmentId: 'Finance',
      role: Roles.REQUESTOR
    },
    {
      name: 'Christopher Mwape',
      employeeId: 'KAN046',
      email: 'christopherm@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.REQUESTOR
    },
    {
      name: 'Sibbuku Sindowe',
      employeeId: 'KAN047',
      email: 'sibbuku@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.REQUESTOR
    },
    {
      name: 'Henry Nkweto',
      employeeId: 'KAN048',
      email: 'henryn@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.REQUESTOR
    },
    {
      name: 'Banji Mwiinga',
      employeeId: 'KAN050',
      email: 'banjim@kanonapower.com',
      departmentId: 'Projects',
      role: Roles.REQUESTOR
    },
    {
      name: 'Humprey Phiri',
      employeeId: 'KAN051',
      email: 'humphreyp@kanonapower.com',
      role: Roles.REQUESTOR
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
