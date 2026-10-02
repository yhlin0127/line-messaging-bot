import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';
import { LINE_MESSAGING_CLIENT } from './line.constants';
import { verifyLineSignature } from './line.signature';

type LineWebhookBody = {
  events?: Array<{
    type?: string;
    replyToken?: string;
    message?: { type?: string; text?: string };
  }>;
};

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(LINE_MESSAGING_CLIENT)
    private readonly client: messagingApi.MessagingApiClient,
  ) {}

  verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    const channelSecret = this.config.get<string>('line.channelSecret') ?? '';
    return verifyLineSignature(rawBody, channelSecret, signature ?? '');
  }

  async handleEvents(body: LineWebhookBody): Promise<void> {
    for (const event of body.events ?? []) {
      try {
        if (
          event.type === 'message' &&
          event.message?.type === 'text' &&
          typeof event.message.text === 'string' &&
          event.replyToken
        ) {
          await this.replyEcho(event.replyToken, event.message.text);
        }
      } catch {
        // Per-event isolation: never fail the whole webhook batch.
        this.logger.error('LINE event handling failed');
      }
    }
  }

  async replyEcho(replyToken: string, text: string): Promise<void> {
    try {
      await this.client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text }],
      });
    } catch {
      // Signature already verified; do not surface reply failures as 5xx / retries.
      // Fixed short log only — never pass err (SDK errors can embed channel tokens).
      this.logger.error('LINE replyMessage failed');
    }
  }
}
