import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';

// Builds the app exactly like main.ts does (prefix, pipes, filters, CORS),
// so e2e tests exercise the same behaviour as production.
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  setupApp(app, 'http://localhost:5173');
  await app.init();
  return app;
}
