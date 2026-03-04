import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const user = await prisma.user.upsert({
    where: { phone: '+233201234567' },
    update: {},
    create: {
      phone: '+233201234567',
      displayName: 'Dev User'
    }
  });

  await prisma.beneficiary.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      userId: user.id,
      name: 'Test Beneficiary',
      phone: '+233501234567',
      network: 'MTN'
    }
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
