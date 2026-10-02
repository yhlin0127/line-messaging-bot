import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { LineService } from './line.service';
import { LINE_MESSAGING_CLIENT } from './line.constants';

describe('LineService', () => {
  const secret = 'test_channel_secret';
  let service: LineService;
  let replyMessage: jest.Mock;

  beforeEach(async () => {
    replyMessage = jest.fn().mockResolvedValue({});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'line.channelSecret' ? secret : undefined,
          },
        },
        {
          provide: LINE_MESSAGING_CLIENT,
          useValue: { replyMessage },
        },
      ],
    }).compile();

    service = module.get(LineService);
  });

  it('verifySignature accepts a valid HMAC', () => {
    const rawBody = Buffer.from('{"events":[]}');
    const signature = crypto
      .createHmac('SHA256', secret)
      .update(rawBody)
      .digest('base64');
    expect(service.verifySignature(rawBody, signature)).toBe(true);
  });

  it('verifySignature rejects a bad HMAC', () => {
    expect(service.verifySignature(Buffer.from('{}'), 'bad')).toBe(false);
  });

  it('handleEvents echoes text via Reply API (stubbed client)', async () => {
    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'reply-token-1',
          message: { type: 'text', text: 'hello poteto' },
        },
      ],
    });

    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'reply-token-1',
      messages: [{ type: 'text', text: 'hello poteto' }],
    });
  });

  it('handleEvents ignores non-text events', async () => {
    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r',
          message: { type: 'image' },
        },
        { type: 'follow', replyToken: 'r2' },
      ],
    });
    expect(replyMessage).not.toHaveBeenCalled();
  });

  it('replyEcho swallows reply failures (no throw)', async () => {
    replyMessage.mockRejectedValueOnce(new Error('upstream 500'));
    await expect(
      service.replyEcho('reply-token-fail', 'hello'),
    ).resolves.toBeUndefined();
    expect(replyMessage).toHaveBeenCalled();
  });

  it('handleEvents continues after a reply failure (per-event try)', async () => {
    replyMessage
      .mockRejectedValueOnce(new Error('first fails'))
      .mockResolvedValueOnce({});
    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 't1',
          message: { type: 'text', text: 'one' },
        },
        {
          type: 'message',
          replyToken: 't2',
          message: { type: 'text', text: 'two' },
        },
      ],
    });
    expect(replyMessage).toHaveBeenCalledTimes(2);
  });
});
