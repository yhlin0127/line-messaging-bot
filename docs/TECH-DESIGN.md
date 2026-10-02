# LINE shared-notes bot — tech design

Personal project (not MECCA). Goal: &lt;50 users; shared grocery / todo notes via LINE Messaging API.

**Status of stack choice:** Research Bot’s first Poteto-style plan recommended **Next.js Route Handlers** (smallest host). YuanHung / Manager are driving a **NestJS** build instead. This doc treats NestJS as the implementation target and keeps the same product scope.

## Product scope (v1)

- Shared notes list(s) for daily things: grocery shopping and/or todos.
- LINE is the UI (text commands; Flex / rich menu later).
- Scale: minor (&lt;50 users). One group (or few groups) is enough.
- Out of v1: web admin, multi-tenant orgs, AI parsing, marketing push, Nest+Next dual apps.

## Recommended stack (Nest target)

| Piece | Choice |
|--------|--------|
| Runtime | Node.js 20+ |
| Framework | NestJS (Express or Fastify adapter) |
| LINE | Messaging API webhook + Reply (Push optional for reminders) |
| DB | Postgres (Neon / Supabase / local Docker) |
| ORM | Prisma or Drizzle |
| Host | Railway / Fly / Render / any HTTPS Node host |
| Secrets | Env only: `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `DATABASE_URL` |

## Phases already sketched

1. **Echo** — public HTTPS webhook, signature verify, reply same text.
2. **Persist** — add item + `list` against DB.
3. **Group scope** — list keyed by LINE `groupId` / `roomId` (or solo `userId`); two phones same group see one list.
4. **done / clear** — complete by index or id; clear completed.
5. **Polish (optional)** — `/grocery` vs `/todo`, rich menu / quick replies, daily reminder Push via cron.

## Data model (minimal)

- `lists`: `id`, `lineScopeId` (group/room/user), `kind` (`grocery` \| `todo` \| `shared`), timestamps
- `items`: `id`, `listId`, `text`, `done`, `createdByLineUserId`, `createdAt`

## Env model

**Not locked in chat.** Propose for Manager to confirm:

| Env | Use |
|-----|-----|
| `local` | ngrok / Cloudflare Tunnel → webhook; local Postgres |
| `SIT` | Shared non-prod LINE channel (or Messaging API channel in develop) + non-prod DB |
| `STG` | Pre-prod channel + DB; webhook URL matches STG deploy |
| `PROD` | Production channel + DB; separate tokens |

One Nest deploy per env; never share channel tokens across envs.

## Open decisions

1. NestJS confirmed vs keep Next.js Route Handler (Research default was Next).
2. One shared list vs separate grocery + todo lists per group.
3. Solo 1:1 chats allowed or group-only.
4. Env naming SIT/STG/PROD and whether SIT uses a separate LINE channel.
5. ORM (Prisma vs Drizzle) and host.
6. Command language (English verbs vs slash commands).

## Locked (from YuanHung chat)

- LINE Messaging API bot.
- Shared notes for grocery / todo style daily lists.
- &lt;50 users.
- Personal repo (not MECCA).
- Architecture diagrams were Mermaid in chat (now saved under this folder).

## Explicitly not locked

- Nest vs Next (Manager now wants Nest).
- SIT/STG/PROD layout.
- Exact command UX, Flex messages, reminders.
