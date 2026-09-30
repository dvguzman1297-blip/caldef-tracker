# CalDef Tracker: setup

## 1. Create the Next.js app (skip if you already have one)
```bash
npx create-next-app@latest caldef --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
cd caldef
```
Use Next.js 15+ with Tailwind v4 (the current default). Files here use `@/…` imports from the project root.

## 2. Paste these files
Extract this zip into the project root and **overwrite** when asked. Then delete `app/page.tsx` (the default starter page) since the dashboard lives at `app/(app)/page.tsx`.

## 3. Install dependencies
```bash
npm i @supabase/supabase-js @supabase/ssr groq-sdk zod react-hook-form @hookform/resolvers framer-motion lucide-react next-themes
```

## 4. Supabase
1. Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor.
2. Auth > URL Configuration: set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in the project URL, anon key, and your Groq key.
4. After registering, make yourself admin in the SQL editor:
   `insert into user_roles (user_id, role) values ('<your-user-uuid>', 'admin');`

## 5. Run
```bash
npm run dev
```

## Notes
- Route protection: `middleware.ts` (login redirect + `/admin` role check), each server action re-checks the user, and RLS is the real enforcement.
- Targets are recomputed server-side in `app/actions/profile.ts` using `lib/health.ts`. Carbs are tracked as net carbs (net target = carbs target minus fiber target).
- Set `APP_TIMEZONE` in `.env.local` to your IANA timezone so "today" rolls over at local midnight.
- UI uses plain Tailwind classes (defined in `app/globals.css`), so no `shadcn init` is needed.
