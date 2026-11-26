import { PrismaService } from '../../src/modules/prisma/prisma.service.js';

export async function resetDb(prisma: PrismaService) {
  const [{ db }] = await prisma.$queryRaw<
    { db: string }[]
  >`SELECT current_database() as db`;

  if (!db.endsWith('_test')) {
    throw new Error(`resetDb refused to run on database "${db}"`);
  }

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename
      from pg_tables
      WHERE schemaname = 'public' and tablename <> '_prisma_migrations'`;

  if (tables.length === 0) return;

  const list = tables.map((t) => `"${t.tablename}"`).join(', ');

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}
