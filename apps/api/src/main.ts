import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';

/**
 * فاز اصلاحی — باگ ۲: بدون این محدودیت صریح، body-parser زیرین از حد
 * پیش‌فرض ۱۰۰kb استفاده می‌کند (تأیید شده با تست واقعی — نتیجه در گزارش
 * فاز). چون هنوز object storage واقعی نداریم (`claude/وضعیت-پیاده‌سازی.md`)،
 * هر عکس/فایل به‌صورت data URL (base64) مستقیماً داخل بدنهٔ JSON فرستاده
 * می‌شود (`file-picker.tsx`)، پس تقریباً هر آپلود واقعی از همان ۱۰۰kb رد
 * می‌شد.
 *
 * محاسبهٔ ۵۰mb (فرم «درخواست تولید»، بدترین حالت واقعی طبق فیلدهای فعلی
 * apps/web/src/app/manufacturing/request/page.tsx):
 *   - logo, productImage, sampleImage: هر سه تصویرند و طبق فاز ب
 *     (file-picker.tsx) قبل از ارسال به WebP کیفیت ۰.۸ و حداکثر ضلع
 *     ۱۶۰۰px فشرده می‌شوند — تست عملی با یک تصویر ۱۶۰۰×۱۶۰۰ نویز کاملاً
 *     تصادفی (بدترین حالت ممکن برای فشرده‌سازی، خیلی بدتر از یک عکس واقعی)
 *     حدود ۱.۷۵MB خروجی داد؛ برای اطمینان ۲MB خام برای هر کدام در نظر
 *     گرفته شده (۶MB جمعاً).
 *   - packagingDesign و attachments[] (حداکثر ۵ فایل) نوع DOCUMENT_TYPES
 *     هستند و PDF می‌توانند باشند — PDF فشرده نمی‌شود (طبق طراحی فاز ب)،
 *     پس بدترین حالت همان DEFAULT_MAX_BYTES خام (۵MB) برای هرکدام است:
 *     ۱ (packagingDesign) + ۵ (attachments) = ۶ فایل × ۵MB = ۳۰MB.
 *   - جمع خام: ۶ + ۳۰ = ۳۶MB؛ بعد از base64 (ضریب ۴/۳): ≈ ۴۸MB.
 *   - فرم «درخواست تصویری» (images[]، حداکثر ۵ فایل، فقط تصویر، همه فشرده
 *     می‌شوند) بسیار کوچک‌تر است (~۱۰MB بعد از base64) و زیر همین سقف است.
 * ۵۰mb با حاشیهٔ اطمینان روی بدترین حالت محاسبه‌شده انتخاب شد — نه یک عدد
 * دلبخواه بزرگ.
 */
const JSON_BODY_LIMIT = '50mb';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(json({ limit: JSON_BODY_LIMIT }));
  app.use(urlencoded({ limit: JSON_BODY_LIMIT, extended: true }));
  app.enableCors({
    origin: (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Edalat Filter API')
      .setDescription('Automotive Filter & Parts Intelligence Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port, config.get<string>('HOST') ?? '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${port}/api/v1`);
}

void bootstrap();
