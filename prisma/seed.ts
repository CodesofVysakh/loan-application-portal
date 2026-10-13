
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient, LoanStatus } from '../apps/api/src/generated/prisma/client';
import bcrypt from 'bcrypt';

const CUSTOMER_EMAIL_PREFIX = 'seed.customer.';
const CUSTOMER_COUNT = 250;
const APPLICATION_COUNT = 10_000;
const BATCH_SIZE = 1_000;
const DEMO_PASSWORD =
  process.env['SEED_CUSTOMER_PASSWORD'] ?? 'CustomerDemo123!';

const PURPOSES = [
  { code: 'HOME_RENOVATION', name: 'Home Renovation' },
  { code: 'EDUCATION', name: 'Education' },
  { code: 'MEDICAL', name: 'Medical Expenses' },
  { code: 'VEHICLE', name: 'Vehicle Purchase' },
  { code: 'DEBT_CONSOLIDATION', name: 'Debt Consolidation' },
  { code: 'TRAVEL', name: 'Travel' },
  { code: 'WEDDING', name: 'Wedding' },
  { code: 'BUSINESS', name: 'Business Expenses' },
  { code: 'EMERGENCY', name: 'Emergency Expenses' },
  { code: 'OTHER', name: 'Other' },
];

const FIRST_NAMES = [
  'Amir', 'Aisha', 'Daniel', 'Nurul', 'Arun', 'Priya', 'Hafiz',
  'Mei Ling', 'Kumar', 'Farah', 'Adam', 'Siti', 'Jason', 'Kavitha',
  'Ravi', 'Sarah', 'Irfan', 'Ananya', 'Wei Jian', 'Aminah',
];

const LAST_NAMES = [
  'Rahman', 'Tan', 'Kumar', 'Lim', 'Ismail', 'Menon', 'Lee',
  'Abdullah', 'Nair', 'Wong', 'Ong', 'Hassan', 'Pillai', 'Yusof',
  'Chong', 'Ibrahim', 'Das', 'Krishnan', 'Low', 'Zakaria',
];

const TENURES = [6, 12, 18, 24, 36, 48, 60];

function makeRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function money(value: number) {
  return value.toFixed(2);
}

function makeNric(customerIndex: number) {
  const birthYear = 70 + (customerIndex % 25);
  const year = String(birthYear).padStart(2, '0');
  const month = String((customerIndex % 12) + 1).padStart(2, '0');
  const day = String((customerIndex % 27) + 1).padStart(2, '0');
  const region = String((customerIndex % 99) + 1).padStart(2, '0');
  const serial = String(customerIndex + 1).padStart(4, '0');

  return `${year}${month}${day}-${region}-${serial}`;
}

async function main() {
  const databaseUrl = process.env['DATABASE_URL'];

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const url = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 10,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    // Preserve the existing administrator and ensure its local credentials work.
    const adminEmail = process.env['ADMIN_EMAIL'];
    const adminPassword = process.env['ADMIN_PASSWORD'];

    if (!adminEmail || !adminPassword) {
      throw new Error(
        'Set ADMIN_EMAIL and ADMIN_PASSWORD in your local .env before seeding.',
      );
    }

    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: {
        fullName: process.env['ADMIN_NAME'] ?? 'Portal Administrator',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
      },
      create: {
        fullName: process.env['ADMIN_NAME'] ?? 'Portal Administrator',
        email: adminEmail.toLowerCase(),
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
      },
    });

    // Purpose records are stable reference data.
    const purposes = [];

    for (const purpose of PURPOSES) {
      const saved = await prisma.loanPurpose.upsert({
        where: { code: purpose.code },
        update: { name: purpose.name },
        create: purpose,
      });

      purposes.push(saved);
    }

    const purposeIds = purposes.map((purpose) => purpose.id);
    const customerPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const customers = [];

    // Upsert makes customer accounts stable between seed runs.
    for (let index = 0; index < CUSTOMER_COUNT; index += 1) {
      const number = String(index + 1).padStart(3, '0');
      const fullName =
        `${FIRST_NAMES[index % FIRST_NAMES.length]} ` +
        LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
      const email = `${CUSTOMER_EMAIL_PREFIX}${number}@example.com`;

      const customer = await prisma.user.upsert({
        where: { email },
        update: {
          fullName,
          passwordHash: customerPasswordHash,
          role: 'CUSTOMER',
        },
        create: {
          fullName,
          email,
          passwordHash: customerPasswordHash,
          role: 'CUSTOMER',
        },
      });

      customers.push(customer);
    }

    // Remove only applications owned by the dedicated demo customers.
    // Applications belonging to other users are preserved.
    const deleted = await prisma.loanApplication.deleteMany({
      where: {
        user: {
          is: {
            email: { startsWith: CUSTOMER_EMAIL_PREFIX },
          },
        },
      },
    });

    console.log(`Removed ${deleted.count} previous demo applications.`);

    const random = makeRandom(20261013);
    const now = Date.now();
    const yearInMs = 365 * 24 * 60 * 60 * 1_000;
    let inserted = 0;

    for (
      let batchStart = 0;
      batchStart < APPLICATION_COUNT;
      batchStart += BATCH_SIZE
    ) {
      const batchEnd = Math.min(
        batchStart + BATCH_SIZE,
        APPLICATION_COUNT,
      );

      const rows = [];

      for (let index = batchStart; index < batchEnd; index += 1) {
        const customerIndex = index % CUSTOMER_COUNT;
        const customer = customers[customerIndex];
        const monthlyIncome = 2_000 + Math.floor(random() * 18_001);
        const loanAmount = Math.round(
          (1_000 + random() * Math.min(monthlyIncome * 12, 150_000)) * 100,
        ) / 100;
        const tenureMonths = TENURES[Math.floor(random() * TENURES.length)];

        // A deterministic distribution: 50% pending, 35% approved, 15% rejected.
        const distribution = index % 20;
        const status: LoanStatus  =
          distribution < 10
            ? 'PENDING'
            : distribution < 17
              ? 'APPROVED'
              : 'REJECTED';

        const createdAt = new Date(
          now - Math.floor(random() * yearInMs),
        );

        const creditCheckedAt =
          status === 'PENDING'
            ? null
            : new Date(
                createdAt.getTime() +
                  (10_000 + Math.floor(random() * 290_001)),
              );

        const phoneSuffix = String(customerIndex + 1).padStart(8, '0');

        rows.push({
          userId: customer.id,
          fullName: customer.fullName,
          email: customer.email,
          nric: makeNric(customerIndex),
          phoneNumber: `+6011${phoneSuffix}`,
          monthlyIncome: money(monthlyIncome),
          loanAmount: money(loanAmount),
          tenureMonths,
          purposeId: purposeIds[Math.floor(random() * purposeIds.length)],
          status,
          rejectionReason:
            status === 'REJECTED'
              ? 'Demo decision: application did not meet the simulated credit criteria.'
              : null,
          creditCheckedAt,
          createdAt,
        });
      }

      await prisma.loanApplication.createMany({ data: rows });
      inserted += rows.length;
      console.log(`Seeded ${inserted.toLocaleString()} / ${APPLICATION_COUNT}`);
    }

    const [customerCount, applicationCount, pending, approved, rejected] =
      await Promise.all([
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.loanApplication.count({
          where: {
            user: {
              is: {
                email: { startsWith: CUSTOMER_EMAIL_PREFIX },
              },
            },
          },
        }),
        prisma.loanApplication.count({ where: { status: 'PENDING' } }),
        prisma.loanApplication.count({ where: { status: 'APPROVED' } }),
        prisma.loanApplication.count({ where: { status: 'REJECTED' } }),
      ]);

    console.log('\nSeed completed.');
    console.log(`Customer accounts in database: ${customerCount}`);
    console.log(`Demo applications: ${applicationCount}`);
    console.log(`Application status totals: pending=${pending}, approved=${approved}, rejected=${rejected}`);
    console.log(`Demo customer login: ${CUSTOMER_EMAIL_PREFIX}001@example.com`);
    console.log(`Demo customer password: ${DEMO_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();