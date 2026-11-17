import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/app.js';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 and { status: "ok" }', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health without the global prefix is 404', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.status).toBe(404);
  });

  it('GET /api/v1/nope is 404', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope');

    expect(res.status).toBe(404);
  });
});
