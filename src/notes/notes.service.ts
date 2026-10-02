import { Inject, Injectable } from '@nestjs/common';
import {
  NOTES_REPOSITORY,
  type NoteItem,
  type NotesRepository,
} from './notes.types';

@Injectable()
export class NotesService {
  constructor(
    @Inject(NOTES_REPOSITORY) private readonly repo: NotesRepository,
  ) {}

  async add(
    lineScopeId: string,
    text: string,
    createdByLineUserId: string,
  ): Promise<NoteItem> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('empty item text');
    }
    const listId = await this.repo.ensureSharedList(lineScopeId);
    return this.repo.addItem(listId, trimmed, createdByLineUserId);
  }

  async list(lineScopeId: string): Promise<NoteItem[]> {
    const listId = await this.repo.ensureSharedList(lineScopeId);
    return this.repo.listItems(listId);
  }

  formatListReply(items: NoteItem[]): string {
    if (items.length === 0) {
      return 'List is empty. Add with: add <text>';
    }
    return items
      .map((item, i) => {
        const mark = item.done ? '✓' : '○';
        return `${i + 1}. ${mark} ${item.text}`;
      })
      .join('\n');
  }
}
