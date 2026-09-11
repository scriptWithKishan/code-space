import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

const server = express();
let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

    app.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    cachedServer = server;
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  app(req, res);
}
