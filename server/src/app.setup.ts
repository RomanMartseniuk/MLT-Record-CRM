import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainErrorFilter } from './common/errors/http-exception.filter.js';

export function setupApp(app: INestApplication, corsOrigin: string) {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainErrorFilter());
  app.enableCors({ origin: corsOrigin });
  app.enableShutdownHooks();
}
