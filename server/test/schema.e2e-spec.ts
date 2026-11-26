import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/app.js';
import { resetDb } from './helpers/db.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';

describe('database schema', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  it('writes and reads a row', async () => {
    await prisma.counter.create({ data: { key: 'purchase', value: 5 } });

    const row = await prisma.counter.findUnique({ where: { key: 'purchase' } });

    expect(row?.value).toBe(5);
  });

  it('starts every test with an empty database', async () => {
    expect(await prisma.counter.count()).toBe(0);
  });
});
