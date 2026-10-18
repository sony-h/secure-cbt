// Load .env BEFORE any other module evaluates so every module reads the real
// configuration at bootstrap (JwtModule, QueueModule, etc.).
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import {
  GlobalExceptionFilter,
  ResponseInterceptor,
  LoggingInterceptor,
} from './common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ── Global Exception Filter ──────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Global Interceptors ──────────────────────────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // ── Security ─────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  const corsEnv = process.env.CORS_ORIGIN || 'http://localhost:3001';
  const allowedOrigins = corsEnv.includes(',')
    ? corsEnv.split(',').map((o) => o.trim())
    : corsEnv;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // ── Validation ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Trust proxy (for rate limiting behind reverse proxy) ─────
  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  // ── Frontend Redirect Fallback for email links opened on backend port ──
  const frontendUrl =
    process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
  if (typeof expressApp.get === 'function') {
    expressApp.get(['/verify-email', '/reset-password', '/register'], (req: any, res: any) => {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const pathname = req.path || '';
      res.redirect(302, `${frontendUrl}${pathname}${query}`);
    });
  }

  // ── API prefix ───────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger ──────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Secure CBT API')
    .setDescription('Computer-Based Test Platform for Indonesian Schools')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication')
    .addTag('users', 'User Management')
    .addTag('students', 'Student Management')
    .addTag('teachers', 'Teacher Management')
    .addTag('academic', 'Academic Data')
    .addTag('questions', 'Question Bank')
    .addTag('exams', 'Exam Management')
    .addTag('sessions', 'Exam Sessions')
    .addTag('answers', 'Answer Management')
    .addTag('monitoring', 'Real-time Monitoring')
    .addTag('grading', 'Grading')
    .addTag('reports', 'Reports')
    .addTag('settings', 'System Settings')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Application running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
