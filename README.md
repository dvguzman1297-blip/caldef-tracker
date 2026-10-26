# CalDef Tracker

Calorie, macro and weight tracker with AI meal estimates and pantry recipes. Next.js (App Router) + Supabase + Groq.

## 1. Install
```bash
npm install
```

## 2. Supabase
1. Run every file in `supabase/migrations/` in order (`0001`–`0007`) in the Supabase SQL editor.
2. Project Settings > API > Exposed schemas: add `caldef` (the app's tables live in that schema).
3. Auth > URL Configuration: set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the project URL, anon key, service role key and your Groq key.
5. After registering, make yourself admin in the SQL editor:
   `insert into caldef.user_roles (user_id, role) values ('<your-user-uuid>', 'admin');`

## 3. Run
```bash
npm run dev        # http://localhost:3000
npm run typecheck && npm run lint && npm test
```

## Notes
- Route protection: `proxy.ts` (login redirect + `/admin` role check), each server action re-checks the user, and RLS is the real enforcement.
- Targets are recomputed server-side in `app/actions/profile.ts` using `lib/health.ts`. Carbs are tracked as net carbs (net target = carbs target minus fiber target).
- AI endpoints are capped per user per day (`AI_DAILY_LIMIT` in `lib/ai-quota.ts`, counted by migration 0007). If the counter can't be reached the call is allowed and the error is logged.
- Account deletion needs `SUPABASE_SERVICE_ROLE_KEY` in the server environment (never expose it to the browser).
- Set `APP_TIMEZONE` in `.env.local` to your IANA timezone so "today" rolls over at local midnight.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint and tests on every push and pull request.
