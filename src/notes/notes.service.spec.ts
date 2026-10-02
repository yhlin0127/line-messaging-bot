import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { NOTES_REPOSITORY, type NoteItem } from './notes.types';

describe('NotesService', () => {
  let service: NotesService;
  const ensureSharedList = jest.fn();
  const addItem = jest.fn();
  const listItems = jest.fn();

  beforeEach(async () => {
    ensureSharedList.mockReset();
    addItem.mockReset();
    listItems.mockReset();
    ensureSharedList.mockResolvedValue('list-1');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: NOTES_REPOSITORY,
          useValue: { ensureSharedList, addItem, listItems },
        },
      ],
    }).compile();
    service = module.get(NotesService);
  });

  it('add ensures shared list then inserts item', async () => {
    const item: NoteItem = {
      id: 'i1',
      text: 'milk',
      done: false,
      createdByLineUserId: 'U1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    addItem.mockResolvedValue(item);

    const result = await service.add('G123', '  milk  ', 'U1');

    expect(ensureSharedList).toHaveBeenCalledWith('G123');
    expect(addItem).toHaveBeenCalledWith('list-1', 'milk', 'U1');
    expect(result).toEqual(item);
  });

  it('add rejects empty text', async () => {
    await expect(service.add('G123', '   ', 'U1')).rejects.toThrow(
      'empty item text',
    );
    expect(ensureSharedList).not.toHaveBeenCalled();
  });

  it('list returns items for scope', async () => {
    listItems.mockResolvedValue([
      {
        id: 'i1',
        text: 'eggs',
        done: false,
        createdByLineUserId: 'U1',
        createdAt: new Date(),
      },
    ]);
    const items = await service.list('G123');
    expect(ensureSharedList).toHaveBeenCalledWith('G123');
    expect(listItems).toHaveBeenCalledWith('list-1');
    expect(items).toHaveLength(1);
  });

  it('formatListReply shows empty hint or numbered lines', () => {
    expect(service.formatListReply([])).toContain('List is empty');
    const formatted = service.formatListReply([
      {
        id: 'i1',
        text: 'milk',
        done: false,
        createdByLineUserId: 'U1',
        createdAt: new Date(),
      },
      {
        id: 'i2',
        text: 'bread',
        done: true,
        createdByLineUserId: 'U2',
        createdAt: new Date(),
      },
    ]);
    expect(formatted).toBe('1. ○ milk\n2. ✓ bread');
  });
});
