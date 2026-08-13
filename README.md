# Stride

Stride helps people return to the things they care about without reconstructing where they left off.

This first engineering milestone is a local, static core-flow prototype:

`Home → Guitar → Blackbird → Log practice → Updated Blackbird state`

The practice form accepts a natural-language note and uses deterministic client-side rules to update Blackbird’s current state for the active app session. There is no backend, authentication, database, or AI service in this milestone.

## Run locally

Requirements: Node.js 20.9 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
pnpm lint
pnpm build
```

Product, UX, and milestone documentation is preserved in [`docs/`](docs/).
