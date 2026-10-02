import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true — required so LINE signature verify uses the exact bytes
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises -- Nest entrypoint
bootstrap();
