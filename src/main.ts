import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb' }));
  app.enableShutdownHooks();
  await app.listen(3000);
}
bootstrap();
