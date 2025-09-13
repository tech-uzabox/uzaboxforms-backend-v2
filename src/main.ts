import 'dotenv/config';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: ['http://localhost:5173'],
      credentials: true,
    },
    rawBody: true,
  });


  app.useBodyParser('json', { limit: '50mb' });
  app.use(compression());
  app.use(cookieParser());

  // Morgan logging middleware
  app.use(morgan('tiny'));
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  const openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Example API')
      .setDescription('Example API description')
      .setVersion('1.0')
      .addBearerAuth({
        description: `Please enter token in following format: Bearer <JWT>`,
        name: 'Authorization',
        bearerFormat: 'JWT',
        scheme: 'bearer',
        type: 'http',
        in: 'Header',
      })
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('/api/v1/docs', app, cleanupOpenApiDoc(openApiDoc));

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
