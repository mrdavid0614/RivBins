import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({ origin: config.get<string>('WEB_ORIGIN', 'http://localhost:3000') });
  app.enableShutdownHooks();

  await app.listen(config.get<number>('PORT', 3001));
}

await bootstrap();
