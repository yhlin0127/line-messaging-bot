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
  let notesDone: jest.Mock;
  let notesClear: jest.Mock;
  let formatListReply: jest.Mock;

  beforeEach(async () => {
    replyMessage = jest.fn().mockResolvedValue({});
    notesAdd = jest.fn();
    notesList = jest.fn();
    notesDone = jest.fn();
    notesClear = jest.fn();
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
            done: notesDone,
            clear: notesClear,
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

  it('handleEvents done command marks item and replies', async () => {
    notesDone.mockResolvedValue({
      id: 'i1',
      text: 'milk',
      done: true,
      createdByLineUserId: 'U1',
      createdAt: new Date(),
    });

    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r-done',
          source: { type: 'group', groupId: 'G1', userId: 'U1' },
          message: { type: 'text', text: 'done 1' },
        },
      ],
    });

    expect(notesDone).toHaveBeenCalledWith('G1', 1);
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'r-done',
      messages: [{ type: 'text', text: 'Done: milk' }],
    });
  });

  it('handleEvents clear command wipes list and replies count', async () => {
    notesClear.mockResolvedValue(2);

    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r-clear',
          source: { type: 'user', userId: 'U1' },
          message: { type: 'text', text: 'clear' },
        },
      ],
    });

    expect(notesClear).toHaveBeenCalledWith('U1');
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'r-clear',
      messages: [{ type: 'text', text: 'Cleared 2 items.' }],
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

  it('handleTextCommand whitespace-only add returns usage (no throw)', async () => {
    const reply = await service.handleTextCommand('add    ', {
      type: 'user',
      userId: 'U1',
    });
    expect(reply).toBe('Usage: add <text>');
    expect(notesAdd).not.toHaveBeenCalled();
  });

  it('handleTextCommand done without number returns usage', async () => {
    const reply = await service.handleTextCommand('done', {
      type: 'user',
      userId: 'U1',
    });
    expect(reply).toBe('Usage: done <n>');
    expect(notesDone).not.toHaveBeenCalled();
  });

  it('handleTextCommand done invalid index replies user-facing error', async () => {
    notesDone.mockResolvedValue(null);
    const reply = await service.handleTextCommand('done 9', {
      type: 'user',
      userId: 'U1',
    });
    expect(reply).toBe('No item at that number. Use list to see items.');
  });

  it('handleTextCommand clear empty list replies empty-state', async () => {
    notesClear.mockResolvedValue(0);
    const reply = await service.handleTextCommand('clear', {
      type: 'user',
      userId: 'U1',
    });
    expect(reply).toBe('List is empty.');
  });

  it('handleEvents add DB failure replies user-facing error', async () => {
    notesAdd.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r-add-fail',
          source: { type: 'user', userId: 'U1' },
          message: { type: 'text', text: 'add milk' },
        },
      ],
    });
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'r-add-fail',
      messages: [{ type: 'text', text: 'Could not save notes. Try again.' }],
    });
  });

  it('handleEvents list DB failure replies user-facing error', async () => {
    notesList.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r-list-fail',
          source: { type: 'user', userId: 'U1' },
          message: { type: 'text', text: 'list' },
        },
      ],
    });
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'r-list-fail',
      messages: [{ type: 'text', text: 'Could not load notes. Try again.' }],
    });
  });

  it('handleEvents done DB failure replies user-facing error', async () => {
    notesDone.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r-done-fail',
          source: { type: 'user', userId: 'U1' },
          message: { type: 'text', text: 'done 1' },
        },
      ],
    });
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'r-done-fail',
      messages: [{ type: 'text', text: 'Could not update notes. Try again.' }],
    });
  });

  it('handleEvents clear DB failure replies user-facing error', async () => {
    notesClear.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await service.handleEvents({
      events: [
        {
          type: 'message',
          replyToken: 'r-clear-fail',
          source: { type: 'user', userId: 'U1' },
          message: { type: 'text', text: 'clear' },
        },
      ],
    });
    expect(replyMessage).toHaveBeenCalledWith({
      replyToken: 'r-clear-fail',
      messages: [{ type: 'text', text: 'Could not clear notes. Try again.' }],
    });
  });
});
