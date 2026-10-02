import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { NotesService } from '../notes/notes.service';
import { LineService } from './line.service';
import { LINE_MESSAGING_CLIENT } from './line.constants';

describe('LineService', () => {
  const secret = 'test_channel_secret';
  let service: LineService;
  let replyMessage: jest.Mock;
  let notesAdd: jest.Mock;
  let notesList: jest.Mock;
  let formatListReply: jest.Mock;

  beforeEach(async () => {
    replyMessage = jest.fn().mockResolvedValue({});
    notesAdd = jest.fn();
    notesList = jest.fn();
    formatListReply = jest.fn();
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
        {
          provide: NotesService,
          useValue: {
            add: notesAdd,
            list: notesList,
            formatListReply,
          },
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

  it('handleEvents echoes non-command text via Reply API', async () => {
    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'reply-token-1',
          source: { type: 'user', userId: 'U1' },
          message: { type: 'text', text: 'hello poteto' },
        },
      ],
    });

    expect(notesAdd).not.toHaveBeenCalled();
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'reply-token-1',
      messages: [{ type: 'text', text: 'hello poteto' }],
    });
  });

  it('handleEvents add command persists and replies', async () => {
    notesAdd.mockResolvedValue({
      id: 'i1',
      text: 'milk',
      done: false,
      createdByLineUserId: 'U1',
      createdAt: new Date(),
    });

    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r-add',
          source: { type: 'group', groupId: 'G1', userId: 'U1' },
          message: { type: 'text', text: 'add milk' },
        },
      ],
    });

    expect(notesAdd).toHaveBeenCalledWith('G1', 'milk', 'U1');
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'r-add',
      messages: [{ type: 'text', text: 'Added: milk' }],
    });
  });

  it('handleEvents list command replies formatted list', async () => {
    notesList.mockResolvedValue([{ id: 'i1', text: 'eggs', done: false }]);
    formatListReply.mockReturnValue('1. ○ eggs');

    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r-list',
          source: { type: 'user', userId: 'U9' },
          message: { type: 'text', text: 'list' },
        },
      ],
    });

    expect(notesList).toHaveBeenCalledWith('U9');
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'r-list',
      messages: [{ type: 'text', text: '1. ○ eggs' }],
    });
  });

  it('resolveScopeId prefers groupId then roomId then userId', () => {
    expect(
      service.resolveScopeId({ groupId: 'G', roomId: 'R', userId: 'U' }),
    ).toBe('G');
    expect(service.resolveScopeId({ roomId: 'R', userId: 'U' })).toBe('R');
    expect(service.resolveScopeId({ userId: 'U' })).toBe('U');
    expect(service.resolveScopeId({})).toBeNull();
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
          source: { type: 'user', userId: 'U1' },
          message: { type: 'text', text: 'one' },
        },
        {
          type: 'message',
          replyToken: 't2',
          source: { type: 'user', userId: 'U1' },
          message: { type: 'text', text: 'two' },
        },
      ],
    });
    expect(replyMessage).toHaveBeenCalledTimes(2);
  });
});
