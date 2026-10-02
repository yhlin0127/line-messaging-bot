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

  /**
   * Mark item at 1-based index done (same order as `list`).
   * Returns null when index is out of range / list empty.
   */
  async done(
    lineScopeId: string,
    index1Based: number,
  ): Promise<NoteItem | null> {
    const listId = await this.repo.ensureSharedList(lineScopeId);
    return this.repo.markItemDone(listId, index1Based);
  }

  /** Wipe all items for the scope; returns deleted count. */
  async clear(lineScopeId: string): Promise<number> {
    const listId = await this.repo.ensureSharedList(lineScopeId);
    return this.repo.clearItems(listId);
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
