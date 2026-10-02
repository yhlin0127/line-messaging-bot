import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';
import { NotesModule } from '../notes/notes.module';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { LINE_MESSAGING_CLIENT } from './line.constants';

@Module({
  imports: [NotesModule],
  controllers: [LineController],
  providers: [
    LineService,
    {
      provide: LINE_MESSAGING_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const channelAccessToken =
          config.get<string>('line.channelAccessToken') ?? '';
        return new messagingApi.MessagingApiClient({ channelAccessToken });
      },
    },
  ],
  exports: [LineService],
})
export class LineModule {}
