import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { LineService } from './line.service';

type LineWebhookPayload = {
  events?: Array<{
    type?: string;
    replyToken?: string;
    message?: { type?: string; text?: string };
  }>;
};

@Controller('webhook')
export class LineController {
  constructor(private readonly lineService: LineService) {}

  /**
   * LINE Messaging API webhook.
   * Verifies `x-line-signature` against the raw body (fail closed), then
   * echoes text messages via Reply API. Always returns 200 after handling
   * a valid request so LINE does not retry unnecessarily.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-line-signature') signature?: string,
  ): Promise<{ ok: true }> {
    const rawBody = req.rawBody;
    if (!rawBody || !this.lineService.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid LINE signature');
    }

    const body = this.parseBody(rawBody, req.body);
    await this.lineService.handleEvents(body);
    return { ok: true };
  }

  private parseBody(rawBody: Buffer, parsed: unknown): LineWebhookPayload {
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return JSON.parse(rawBody.toString('utf8')) as LineWebhookPayload;
  }
}
