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
};

export const NOTES_REPOSITORY = 'NOTES_REPOSITORY';
