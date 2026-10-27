import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LocalStorageService, PUBLIC_UPLOADS_PREFIX } from './storage/local-storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // detras de nginx, para que req.ip sea la IP real del cliente (throttler y auditoria)
  app.set('trust proxy', 1);
  app.use(
    helmet({
      // la API solo entrega JSON y Swagger UI; la CSP rompe los scripts inline de Swagger
      contentSecurityPolicy: false,
      // las portadas se consumen desde el front, que en desarrollo es otro origen
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGIN', '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    exposedHeaders: ['Content-Disposition'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useStaticAssets(app.get(LocalStorageService).getRoot(), {
    prefix: PUBLIC_UPLOADS_PREFIX,
    index: false,
    maxAge: '7d',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CMPC Libros API')
    .setDescription('Gestión de inventario de libros')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig), {
    swaggerOptions: { persistAuthorization: true },
  });

  app.enableShutdownHooks();
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`API en http://localhost:${port}/api - docs en /api/docs`, 'Bootstrap');
}

void bootstrap();
