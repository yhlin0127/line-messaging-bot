import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.constants';
import type { NoteItem, NotesRepository } from './notes.types';

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
    const result = await this.pool.query<{
      id: string;
      text: string;
      done: boolean;
      created_by_line_user_id: string;
      created_at: Date;
    }>(
      `INSERT INTO items (list_id, text, created_by_line_user_id)
       VALUES ($1, $2, $3)
       RETURNING id, text, done, created_by_line_user_id, created_at`,
      [listId, text, createdByLineUserId],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      text: row.text,
      done: row.done,
      createdByLineUserId: row.created_by_line_user_id,
      createdAt: row.created_at,
    };
  }

  async listItems(listId: string): Promise<NoteItem[]> {
    const result = await this.pool.query<{
      id: string;
      text: string;
      done: boolean;
      created_by_line_user_id: string;
      created_at: Date;
    }>(
      `SELECT id, text, done, created_by_line_user_id, created_at
       FROM items
       WHERE list_id = $1
       ORDER BY created_at ASC`,
      [listId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      text: row.text,
      done: row.done,
      createdByLineUserId: row.created_by_line_user_id,
      createdAt: row.created_at,
    }));
  }
}
