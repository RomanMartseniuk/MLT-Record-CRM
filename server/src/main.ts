import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  setupApp(app, config.get('CORS_ORIGIN', { infer: true }));
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
