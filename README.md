# Stride

Stride helps people return to the things they care about without reconstructing where they left off.

This milestone replaces the earlier local-only prototype with a Supabase-backed app:

`Home → Guitar → Blackbird → Log practice → Updated Blackbird state`

## What’s included

- Next.js + TypeScript
- Tailwind CSS
- shadcn/ui primitives
- Lucide icons
- Supabase Auth
- Supabase Postgres persistence
- Row Level Security for user-owned data

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase URL and publishable key
3. Run the schema in `supabase/migrations/0001_stride_schema.sql` against your Supabase project
4. Make sure email/password auth is enabled in Supabase Auth

Then run:

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

## Notes

- The seeded Guitar/Blackbird experience is created in the database for each authenticated user.
- There is no AI, Supabase service role usage, or auth secret committed in this repo.
- Product, UX, and milestone documentation is preserved in [`docs/`](docs/).
