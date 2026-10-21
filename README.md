# Suraksha360

AI-powered urban safety platform — landing site, authentication, and dashboard shell.
Access the project using this link:https://suraksha-360-m9okfjsfq-sakshat3103s-projects.vercel.app/login?redirectTo=%2Fdashboard

## Stack

- Next.js 15 (App Router) + TypeScript
- TailwindCSS v4 + hand-rolled shadcn/ui-style primitives
- Framer Motion, Zustand, TanStack React Query
- Supabase (auth + Postgres, via `@supabase/ssr`)
- Google Maps API (wired for the next phase — safe routing)

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase + Google Maps keys
npm run dev
```

Run `supabase/schema.sql` in your Supabase project's SQL editor to create
`profiles`, `emergency_contacts`, and `user_settings`, along with their RLS
policies and the on-signup trigger that seeds a profile + settings row.

## Structure

```
src/
├── app/
│   ├── (marketing)/          # reserved for future public pages
│   ├── (auth)/                login, signup, forgot-password + shared layout
│   ├── (dashboard)/            dashboard, profile, settings, contacts + shared layout
│   ├── page.tsx                 landing page
│   └── globals.css              design tokens, glass utilities, theme variables
├── components/
│   ├── ui/                      button, card, input, dialog, sheet, tabs, …
│   ├── landing/                 hero, product showcase, AI features, stats, testimonials, footer
│   ├── auth/                    login/signup/forgot-password forms
│   ├── dashboard/                sidebar, topbar, mobile nav, journey + contacts UI
│   ├── shared/                   logo, section heading
│   └── providers/                theme, react-query, auth, toaster
├── lib/
│   ├── supabase/                 browser + server clients, middleware session refresh
│   └── actions/                  server actions (auth, contacts, profile/settings)
├── store/                        zustand stores (auth, ui, journey)
├── hooks/                        react-query hooks (contacts, settings)
└── types/database.ts             hand-written Supabase Database types
```

## Notes

- Auth routes and dashboard routes are protected/redirected in `src/middleware.ts`
  via `updateSession` — unauthenticated users are bounced to `/login`, and
  signed-in users are bounced out of `/login`, `/signup`, `/forgot-password`.
- Theme defaults to dark (glassmorphism, gradient accents); light mode tokens
  are included and toggleable from Settings → Appearance.
- Emergency Contacts and Settings are wired end-to-end to Supabase through
  server actions + React Query — no mock data once your `.env.local` is set.
- AI features (safe routing, risk scoring, transit safety) are intentionally
  out of scope for this pass — dashboard UI has placeholders ready for them.

## Deploy

Ready for Vercel as-is: `vercel` or connect the repo, set the env vars from
`.env.local.example` in the project settings, and deploy.
