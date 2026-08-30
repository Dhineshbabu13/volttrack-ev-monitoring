import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminId = 'ADM001';
  const rawPassword = 'test123';
  const adminName = 'Test Admin';

  const hashed = await bcrypt.hash(rawPassword, 10);

  // Upsert test admin record
  const admin = await prisma.admins.upsert({
    where: { admin_id: adminId },
    update: {
      admin_name: adminName,
      password_hash: hashed,
    },
    create: {
      admin_id: adminId,
      admin_name: adminName,
      password_hash: hashed,
    },
  });

  console.log(`Test admin upserted successfully: ${admin.admin_id} / ${rawPassword}`);
}

main()
  .catch((e) => {
    console.error('Error creating test admin:', e);
  })
  .finally(() => prisma.$disconnect());
