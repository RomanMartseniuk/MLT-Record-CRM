import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { LocalStatus, PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const STATUS_MAPPINGS = [
  { raw: 'in-queue', local: LocalStatus.IN_QUEUE, label: 'В черзі' },
  { raw: 'in-progress', local: LocalStatus.IN_WORK, label: 'В роботі' },
  { raw: 'ready', local: LocalStatus.DONE, label: 'Готово' },
  { raw: 'closed', local: LocalStatus.CLOSED, label: 'Видано' },
];

const ORDER_TYPES = [
  { roAppId: 'ot_paid', name: 'Платний' },
  { roAppId: 'ot_warranty', name: 'Гарантійний' },
  { roAppId: 'ot_internal', name: 'Внутрішній' },
  { roAppId: 'ot_free', name: 'Безкоштовний' },
];

async function main() {
  await prisma.counter.upsert({
    where: { key: 'purchase' },
    update: {},
    create: { key: 'purchase', value: 0 },
  });

  for (const s of STATUS_MAPPINGS) {
    await prisma.statusMapping.upsert({
      where: { raw: s.raw },
      update: { local: s.local, label: s.label },
      create: s,
    });
  }

  for (const t of ORDER_TYPES) {
    await prisma.orderType.upsert({
      where: { roAppId: t.roAppId },
      update: { name: t.name },
      create: t,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
