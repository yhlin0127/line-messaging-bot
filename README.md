# line-messaging-bot

Personal LINE Messaging API **shared-notes** bot (grocery / todo style lists), NestJS.


## Docs (source of truth)

| File | Role |
|------|------|
| [docs/TECH-DESIGN.md](docs/TECH-DESIGN.md) | Stack, phases, data model, env model |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Mermaid flows + Nest module map |
| [docs/README.md](docs/README.md) | Research pack index |

## Phase status

- **Phase 1:** Nest scaffold, `GET /health`, config/env stubs (`local` / `SIT` / `STG` / `PROD`), thin `line/` + `notes/` modules.
- **Phase 2:** LINE webhook signature verify (`x-line-signature` + raw body), text echo via Reply API.
- **Phase 3:** Postgres persist (`pg` + SQL migrations), `add` / `list` commands scoped by `groupId` / `roomId` / `userId`. Non-command text still echoes. No Prisma/Drizzle.
- **Phase 4 (this branch):** `done <n>` marks item done (`items.done`); `clear` deletes all items for the scope. Fail-soft user-facing replies on usage/DB errors.
- **Phase 5+:** Flex, Push, deploy — see tech design.

## Prerequisites

- Node.js **20+** (nvm `22.16.0` works)
- Postgres for local persist (Docker example below)

## Local setup

```bash
cp .env.example .env
# edit LINE_CHANNEL_* and DATABASE_URL

# optional local Postgres
docker run --name line-bot-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=line_messaging_bot -p 5432:5432 -d postgres:16

npm install
npm run migrate
npm run start:dev
```

Health check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

### Commands (webhook text)

| Text | Behavior |
|------|----------|
| `add <text>` | Insert item on the shared list for this chat scope |
| `list` | Show numbered items (`○` open / `✓` done) |
| `done <n>` | Mark item N done (1-based index from `list`) |
| `clear` | Delete all items for this chat scope |
| other text | Echo (Phase 2 behavior kept) |

Scope: LINE `groupId` → `roomId` → `userId` (group + 1:1). One shared list per scope (`kind = shared`).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Nest watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (DB stubbed via repository) |
| `npm run test:e2e` | e2e (health + webhook; NotesService stubbed) |
| `npm run migrate` | Apply SQL files in `migrations/` via `DATABASE_URL` |

## Env model

`APP_ENV`: `local` | `sit` | `stg` | `prod` — **never** share LINE channel tokens across envs. See `.env.example`.

## License

MIT — see [LICENSE](LICENSE).
