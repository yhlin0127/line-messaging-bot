import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.constants';
import type { NoteItem, NotesRepository } from './notes.types';

type ItemRow = {
  id: string;
  text: string;
  done: boolean;
  created_by_line_user_id: string;
  created_at: Date;
};

function mapRow(row: ItemRow): NoteItem {
  return {
    id: row.id,
    text: row.text,
    done: row.done,
    createdByLineUserId: row.created_by_line_user_id,
    createdAt: row.created_at,
  };
}

@Injectable()
export class PgNotesRepository implements NotesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ensureSharedList(lineScopeId: string): Promise<string> {
    const existing = await this.pool.query<{ id: string }>(
      `SELECT id FROM lists WHERE line_scope_id = $1 LIMIT 1`,
      [lineScopeId],
    );
    if (existing.rows[0]) {
      return existing.rows[0].id;
    }
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO lists (line_scope_id, kind)
       VALUES ($1, 'shared')
       ON CONFLICT (line_scope_id) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [lineScopeId],
    );
    return inserted.rows[0].id;
  }

  async addItem(
    listId: string,
    text: string,
    createdByLineUserId: string,
  ): Promise<NoteItem> {
    const result = await this.pool.query<ItemRow>(
      `INSERT INTO items (list_id, text, created_by_line_user_id)
       VALUES ($1, $2, $3)
       RETURNING id, text, done, created_by_line_user_id, created_at`,
      [listId, text, createdByLineUserId],
    );
    return mapRow(result.rows[0]);
  }

  async listItems(listId: string): Promise<NoteItem[]> {
    const result = await this.pool.query<ItemRow>(
      `SELECT id, text, done, created_by_line_user_id, created_at
       FROM items
       WHERE list_id = $1
       ORDER BY created_at ASC, id ASC`,
      [listId],
    );
    return result.rows.map(mapRow);
  }

  async markItemDone(
    listId: string,
    index1Based: number,
  ): Promise<NoteItem | null> {
    if (!Number.isInteger(index1Based) || index1Based < 1) {
      return null;
    }
    const result = await this.pool.query<ItemRow>(
      `WITH ordered AS (
         SELECT id
         FROM items
         WHERE list_id = $1
         ORDER BY created_at ASC, id ASC
         OFFSET $2
         LIMIT 1
       )
       UPDATE items
       SET done = TRUE
       WHERE id = (SELECT id FROM ordered)
       RETURNING id, text, done, created_by_line_user_id, created_at`,
      [listId, index1Based - 1],
    );
    if (!result.rows[0]) {
      return null;
    }
    return mapRow(result.rows[0]);
  }

  async clearItems(listId: string): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM items WHERE list_id = $1`,
      [listId],
    );
    return result.rowCount ?? 0;
  }
}
