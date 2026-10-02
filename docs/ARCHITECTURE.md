# LINE shared-notes bot — architecture

Companion to `TECH-DESIGN.md`. Diagrams first drawn in Research Bot chat (Mermaid); saved here for Manager / Nest build.

## Request flow

```mermaid
sequenceDiagram
  participant U as User in LINE
  participant L as LINE Platform
  participant N as NestJS webhook
  participant DB as Postgres

  U->>L: add milk / list / done 3
  L->>N: POST /webhook + x-line-signature
  N->>N: Verify signature
  N->>DB: Add / list / complete item<br/>(scoped by groupId)
  DB-->>N: Updated items
  N->>L: Reply API (replyToken)
  L->>U: Updated shared list
```

## Tech architecture (Nest)

```mermaid
flowchart TB
  subgraph Clients
    P1[Phone A]
    P2[Phone B]
  end

  subgraph LINE
    OA[Official Account<br/>Messaging API]
  end

  subgraph Nest["NestJS app"]
    CTL["LineController<br/>POST /webhook"]
    SVC["LineService<br/>signature + events"]
    NOTES["NotesService<br/>list CRUD"]
  end

  subgraph Data
    PG[(Postgres<br/>lists + items)]
  end

  P1 --> OA
  P2 --> OA
  OA -->|"HTTPS webhook"| CTL
  CTL --> SVC
  SVC --> NOTES
  NOTES --> PG
  SVC -->|"Reply / Push"| OA
  OA --> P1
  OA --> P2
```

## Suggested Nest module map

```
src/
  app.module.ts
  line/
    line.module.ts
    line.controller.ts      # POST /webhook
    line.service.ts         # verify, dispatch events, reply/push
    line.signature.ts
  notes/
    notes.module.ts
    notes.service.ts        # add / list / done / clear
  prisma/ or drizzle/       # schema + client
```

## Shared notes scope

```mermaid
flowchart LR
  G[LINE groupId] --> List[One shared list]
  List --> I1[milk]
  List --> I2[eggs]
  List --> I3[todo: pay rent]
```

## Boundaries

- Secrets stay server-side only.
- Return HTTP 200 to LINE quickly; do heavy work before reply or queue later.
- Prefer **Reply** with `replyToken` for command responses; **Push** only for reminders.
- Do not put `GameState` / MECCA patterns here — personal bot only.
