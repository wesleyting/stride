# Stride

Stride is a guitar-practice tracker that helps you resume each song with useful context. It supports timed sessions, lightweight practice logs, pinned songs, private practice media, and intentionally shared public profiles.

## Stack

- Next.js 16 and TypeScript
- Tailwind CSS and shadcn/ui
- Supabase Auth, Postgres, Storage, and Row Level Security
- Zod validation

## Local setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run every file in `supabase/migrations/` in numeric order.
3. In **Authentication → Providers → Anonymous Sign-Ins**, enable anonymous sign-ins.
4. Copy `.env.example` to `.env.local`.
5. Fill in the three environment variables described below.
6. Install dependencies and start the app:

```bash
corepack pnpm install
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

- `NEXT_PUBLIC_SITE_URL` is Stride's own URL. Use `http://localhost:3000` locally and the final HTTPS domain in production.
- Find the Supabase Project URL and Publishable key in the project's **Connect** dialog. They are also available under **Settings → API Keys**.
- The publishable key is designed for browser applications and is protected by the project's RLS policies.
- Do not add a Supabase secret key or legacy `service_role` key to this application.

## Supabase Auth configuration

In **Authentication → URL Configuration**:

- Set **Site URL** to the production Stride domain.
- Add `http://localhost:3000/auth/callback` for local development.
- Add `https://your-domain.com/auth/callback` for production.

For the current server-side confirmation template, the confirmation link can use:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Password recovery uses `/auth/callback?next=/reset-password`. Keep the Supabase recovery email template's confirmation URL in place, and make sure the production `/auth/callback` URL is allowed in **Authentication → URL Configuration**.

Keep the **Change email address** template's `{{ .ConfirmationURL }}` link intact. Stride supplies an allowed `/auth/callback` redirect so a guest returns to the password step after confirming their email.

Guest visitors receive an anonymous Supabase user only when they choose **Add Song**. They can use the complete private practice workflow and later attach an email and password without changing ownership of their data. Public profiles, public songs, and media uploads require a permanent account. Before opening guest access broadly, add Cloudflare Turnstile or another supported CAPTCHA token to the guest-start flow, then enable the matching CAPTCHA integration in Supabase.

Supabase does not automatically remove abandoned anonymous users. Periodically remove old guest accounts after choosing an appropriate retention window; application records are deleted with them through the existing foreign-key cascades.

## Deploying to Vercel

1. Import the Git repository into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to Production and Preview.
3. Add `NEXT_PUBLIC_SITE_URL` to Production using the final HTTPS domain. Preview deployments can omit it and use Vercel's generated deployment URL.
4. Deploy, then add the final `/auth/callback` URL to Supabase's allowed redirect URLs.
5. Enable **Web Analytics** and **Speed Insights** in the Vercel project dashboard.
6. Redeploy after changing environment variables.

The app includes its favicon, web manifest, social preview image, security headers, robots rules, sitemap, canonical metadata for public pages, and authenticated-route `noindex` defaults.

For a clean production launch, use a separate Supabase production project and run all migrations in order. Keep the existing project as development/staging rather than resetting it in place. Migration `0016_remove_legacy_item_state.sql` removes the unused generic-MVP item state columns from the final schema.

## Verification

```bash
corepack pnpm lint
corepack pnpm build
```

There is no AI integration and no privileged Supabase key in this repository. Product and UX documentation remains in `docs/`.
