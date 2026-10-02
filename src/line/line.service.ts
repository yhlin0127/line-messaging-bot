import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';
import { NotesService } from '../notes/notes.service';
import { LINE_MESSAGING_CLIENT } from './line.constants';
import { verifyLineSignature } from './line.signature';

type LineEventSource = {
  type?: string;
  userId?: string;
  groupId?: string;
  roomId?: string;
};

type LineWebhookBody = {
  events?: Array<{
    type?: string;
    replyToken?: string;
    source?: LineEventSource;
    message?: { type?: string; text?: string };
  }>;
};

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(LINE_MESSAGING_CLIENT)
    private readonly client: messagingApi.MessagingApiClient,
    private readonly notes: NotesService,
  ) {}

  verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    const channelSecret = this.config.get<string>('line.channelSecret') ?? '';
    return verifyLineSignature(rawBody, channelSecret, signature ?? '');
  }

  async handleEvents(body: LineWebhookBody): Promise<void> {
    for (const event of body.events ?? []) {
      try {
        if (
          event.type === 'message' &&
          event.message?.type === 'text' &&
          typeof event.message.text === 'string' &&
          event.replyToken
        ) {
          const reply = await this.handleTextCommand(
            event.message.text,
            event.source,
          );
          await this.replyText(event.replyToken, reply);
        }
      } catch {
        // Last-resort per-event isolation; prefer user-facing replies inside
        // handleTextCommand so the replyToken is still spent.
        this.logger.error('LINE event handling failed');
      }
    }
  }

  /**
   * Commands: `add <text>`, `list`, `done <n>`, `clear`.
   * Non-commands keep Phase 2 echo behavior.
   * Scope: groupId → roomId → userId (group + 1:1 locked).
   * Returns user-facing strings on validation/DB errors (no throw).
   */
  async handleTextCommand(
    text: string,
    source?: LineEventSource,
  ): Promise<string> {
    const trimmed = text.trim();
    const scopeId = this.resolveScopeId(source);
    const userId = source?.userId ?? 'unknown';

    const addMatch = /^add(?:\s+(.*))?$/i.exec(trimmed);
    if (addMatch) {
      if (!scopeId) {
        return 'Cannot determine chat scope.';
      }
      const itemText = (addMatch[1] ?? '').trim();
      if (!itemText) {
        return 'Usage: add <text>';
      }
      try {
        const item = await this.notes.add(scopeId, itemText, userId);
        return `Added: ${item.text}`;
      } catch {
        return 'Could not save notes. Try again.';
      }
    }

    if (/^list$/i.test(trimmed)) {
      if (!scopeId) {
        return 'Cannot determine chat scope.';
      }
      try {
        const items = await this.notes.list(scopeId);
        return this.notes.formatListReply(items);
      } catch {
        return 'Could not load notes. Try again.';
      }
    }

    const doneMatch = /^done(?:\s+(.*))?$/i.exec(trimmed);
    if (doneMatch) {
      if (!scopeId) {
        return 'Cannot determine chat scope.';
      }
      const rawIndex = (doneMatch[1] ?? '').trim();
      if (!rawIndex || !/^\d+$/.test(rawIndex)) {
        return 'Usage: done <n>';
      }
      const index = Number.parseInt(rawIndex, 10);
      if (index < 1) {
        return 'Usage: done <n>';
      }
      try {
        const item = await this.notes.done(scopeId, index);
        if (!item) {
          return 'No item at that number. Use list to see items.';
        }
        return `Done: ${item.text}`;
      } catch {
        return 'Could not update notes. Try again.';
      }
    }

    if (/^clear$/i.test(trimmed)) {
      if (!scopeId) {
        return 'Cannot determine chat scope.';
      }
      try {
        const count = await this.notes.clear(scopeId);
        if (count === 0) {
          return 'List is empty.';
        }
        return `Cleared ${count} item${count === 1 ? '' : 's'}.`;
      } catch {
        return 'Could not clear notes. Try again.';
      }
    }

    // Non-command: keep echo (Phase 2 behavior).
    return text;
  }

  resolveScopeId(source?: LineEventSource): string | null {
    if (!source) {
      return null;
    }
    return source.groupId || source.roomId || source.userId || null;
  }

  async replyText(replyToken: string, text: string): Promise<void> {
    try {
      await this.client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text }],
      });
    } catch {
      // Signature already verified; do not surface reply failures as 5xx / retries.
      // Fixed short log only — never pass err (SDK errors can embed channel tokens).
      this.logger.error('LINE replyMessage failed');
    }
  }

  /** @deprecated Prefer replyText; kept for tests that call replyEcho. */
  async replyEcho(replyToken: string, text: string): Promise<void> {
    await this.replyText(replyToken, text);
  }
}
