import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as crypto from 'crypto';
import { AppModule } from './../src/app.module';
import { LINE_MESSAGING_CLIENT } from './../src/line/line.constants';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const channelSecret = 'e2e_channel_secret';
  const replyMessage = jest.fn().mockResolvedValue({});

  function sign(raw: string): string {
    return crypto
      .createHmac('SHA256', channelSecret)
      .update(raw)
      .digest('base64');
  }

  beforeEach(async () => {
    replyMessage.mockClear();
    process.env.LINE_CHANNEL_SECRET = channelSecret;
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'e2e_token';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LINE_MESSAGING_CLIENT)
      .useValue({ replyMessage })
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();
  });

  it('GET /health → 200', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /webhook without signature → 401', () => {
    return request(app.getHttpServer())
      .post('/webhook')
      .send({ events: [] })
      .expect(401);
  });

  it('POST /webhook with bad signature → 401', () => {
    return request(app.getHttpServer())
      .post('/webhook')
      .set('x-line-signature', 'not-valid')
      .send({ events: [] })
      .expect(401);
  });

  it('POST /webhook valid text message → 200 and echo reply', async () => {
    const payload = {
      destination: 'Udest',
      events: [
        {
          type: 'message',
          replyToken: 'e2e-reply-token',
          message: { type: 'text', text: 'ping' },
        },
      ],
    };
    const raw = JSON.stringify(payload);

    await request(app.getHttpServer())
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', sign(raw))
      .send(raw)
      .expect(200)
      .expect({ ok: true });

    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'e2e-reply-token',
      messages: [{ type: 'text', text: 'ping' }],
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
