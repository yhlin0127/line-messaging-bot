# line-messaging-bot

Personal LINE Messaging API **shared-notes** bot (grocery / todo style lists), NestJS.

**Not** related to MECCA / DPT work.

## Docs (source of truth)

| File | Role |
|------|------|
| [docs/TECH-DESIGN.md](docs/TECH-DESIGN.md) | Stack, phases, data model, env model |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Mermaid flows + Nest module map |
| [docs/README.md](docs/README.md) | Research pack index |

## Phase status

- **Phase 1 (this branch):** Nest scaffold, `GET /health`, config/env stubs (`local` / `SIT` / `STG` / `PROD`), thin `line/` + `notes/` modules (`POST /webhook` → 501). No ORM/DB yet.
- **Phase 2+:** LINE webhook + signature verify, persist/DB, echo / list commands — see tech design.

## Prerequisites

- Node.js **20+** (nvm `22.16.0` works)

## Local setup

```bash
cp .env.example .env
# edit placeholders: LINE_CHANNEL_* (separate secrets per env)

npm install
npm run start:dev
```

Health check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Nest watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Unit / smoke tests |
| `npm run test:e2e` | e2e (health + webhook stub) |

## Env model

`APP_ENV`: `local` \| `sit` \| `stg` \| `prod` — **never** share LINE channel tokens across envs. See `.env.example`.

## License

MIT — see [LICENSE](LICENSE).
