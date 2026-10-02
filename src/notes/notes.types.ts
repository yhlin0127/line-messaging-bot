export type NoteItem = {
  id: string;
  text: string;
  done: boolean;
  createdByLineUserId: string;
  createdAt: Date;
};

export type NotesRepository = {
  ensureSharedList(lineScopeId: string): Promise<string>;
  addItem(
    listId: string,
    text: string,
    createdByLineUserId: string,
  ): Promise<NoteItem>;
  listItems(listId: string): Promise<NoteItem[]>;
  /** 1-based index matching `list` display order; null if out of range. */
  markItemDone(listId: string, index1Based: number): Promise<NoteItem | null>;
  /** Deletes all items for the list; returns deleted row count. */
  clearItems(listId: string): Promise<number>;
};

export const NOTES_REPOSITORY = 'NOTES_REPOSITORY';
