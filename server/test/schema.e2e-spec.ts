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

  describe('inTx', () => {
    it('commits all writes when the callback succeeds', async () => {
      const result = await prisma.inTx(async (tx) => {
        await tx.counter.create({ data: { key: 'a', value: 1 } });
        await tx.counter.create({ data: { key: 'b', value: 2 } });
        return 'done';
      });

      expect(result).toBe('done');
      expect(await prisma.counter.count()).toBe(2);
    });

    it('rolls back every write and rethrows when the callback fails', async () => {
      await expect(
        prisma.inTx(async (tx) => {
          await tx.counter.create({ data: { key: 'a', value: 1 } });
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(await prisma.counter.count()).toBe(0);
    });

    it('rolls back when the database rejects a later write', async () => {
      await expect(
        prisma.inTx(async (tx) => {
          await tx.counter.create({ data: { key: 'a', value: 1 } });
          await tx.counter.create({ data: { key: 'a', value: 2 } });
        }),
      ).rejects.toThrow();

      expect(await prisma.counter.count()).toBe(0);
    });
  });
});
