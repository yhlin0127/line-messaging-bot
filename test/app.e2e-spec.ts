import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as crypto from 'crypto';
import { AppModule } from './../src/app.module';
import { LINE_MESSAGING_CLIENT } from './../src/line/line.constants';
import { NotesService } from './../src/notes/notes.service';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const channelSecret = 'e2e_channel_secret';
  const replyMessage = jest.fn().mockResolvedValue({});
  const notesAdd = jest.fn();
  const notesList = jest.fn();
  const formatListReply = jest.fn();

  function sign(raw: string): string {
    return crypto
      .createHmac('SHA256', channelSecret)
      .update(raw)
      .digest('base64');
  }

  beforeEach(async () => {
    replyMessage.mockClear();
    notesAdd.mockReset();
    notesList.mockReset();
    formatListReply.mockReset();
    process.env.LINE_CHANNEL_SECRET = channelSecret;
    process.env.LINE_CHANNEL_ACCESS_TOKEN = 'e2e_token';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/line_messaging_bot';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LINE_MESSAGING_CLIENT)
      .useValue({ replyMessage })
      .overrideProvider(NotesService)
      .useValue({
        add: notesAdd,
        list: notesList,
        formatListReply,
      })
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
          source: { type: 'user', userId: 'Ue2e' },
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

  it('POST /webhook add command → 200 and Added reply', async () => {
    notesAdd.mockResolvedValue({
      id: 'i1',
      text: 'milk',
      done: false,
      createdByLineUserId: 'Ue2e',
      createdAt: new Date(),
    });
    const payload = {
      destination: 'Udest',
      events: [
        {
          type: 'message',
          replyToken: 'e2e-add',
          source: { type: 'group', groupId: 'Ge2e', userId: 'Ue2e' },
          message: { type: 'text', text: 'add milk' },
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

    expect(notesAdd).toHaveBeenCalledWith('Ge2e', 'milk', 'Ue2e');
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'e2e-add',
      messages: [{ type: 'text', text: 'Added: milk' }],
    });
  });

  it('POST /webhook list command → 200 and formatted list', async () => {
    notesList.mockResolvedValue([]);
    formatListReply.mockReturnValue('List is empty. Add with: add <text>');
    const payload = {
      destination: 'Udest',
      events: [
        {
          type: 'message',
          replyToken: 'e2e-list',
          source: { type: 'user', userId: 'Ue2e' },
          message: { type: 'text', text: 'list' },
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

    expect(notesList).toHaveBeenCalledWith('Ue2e');
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'e2e-list',
      messages: [{ type: 'text', text: 'List is empty. Add with: add <text>' }],
    });
  });

  it('POST /webhook valid signature but reply fails → still 200, no token in body', async () => {
    const accessToken = 'e2e_token';
    replyMessage.mockRejectedValueOnce(
      new Error(`LINE API error while using ${accessToken}`),
    );
    const payload = {
      destination: 'Udest',
      events: [
        {
          type: 'message',
          replyToken: 'e2e-reply-fail',
          source: { type: 'user', userId: 'Ue2e' },
          message: { type: 'text', text: 'boom' },
        },
      ],
    };
    const raw = JSON.stringify(payload);

    const res = await request(app.getHttpServer())
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-line-signature', sign(raw))
      .send(raw)
      .expect(200)
      .expect({ ok: true });

    const bodyStr = JSON.stringify(res.body);
    const text = res.text ?? '';
    expect(bodyStr).not.toContain(accessToken);
    expect(text).not.toContain(accessToken);
    expect(replyMessage).toHaveBeenCalled();
  });

  afterEach(async () => {
    await app.close();
  });
});
