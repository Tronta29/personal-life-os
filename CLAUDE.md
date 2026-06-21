# Personal Life OS

Tek kullanıcılı, yapay zeka destekli kişisel yaşam yönetim sistemi (PWA). Detaylı spec: `personal_life_os_spec.md`. Kurulum: `KURULUM.md`.

## Yığın
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (CSS değişkenli tema, `app/globals.css`), shadcn benzeri el yapımı UI (`components/ui/`, Radix yok)
- **Neon (PostgreSQL) + Prisma 6** (veri katmanı) — spec'teki Supabase yerine kullanıldı (Supabase kotası nedeniyle)
- **Basit cookie auth** (tek kullanıcı) — Supabase Auth yerine
- Gemini 2.0 Flash (Faz 4)
- Deploy: Vercel

## Mimari notlar
- **Veri:** Prisma client singleton `lib/prisma.ts`. Şema `prisma/schema.prisma` — alan adları kasıtlı **snake_case** (API JSON ↔ frontend birebir uyumlu olsun diye, tablolar `@@map` ile). Seed: `prisma/seed.ts` (`npm run db:seed`). Şema uygula: `npm run db:push`.
- **Auth:** `lib/auth.ts` — HMAC-SHA256 imzalı cookie, Web Crypto ile (edge+node uyumlu, `proxy.ts` import eder). Sunucu tarafı kontrol `lib/auth-server.ts` (`isAuthenticated()`, next/headers cookies). Giriş şifresi `APP_PASSWORD`, imza anahtarı `AUTH_SECRET` (.env.local). Login/logout: `app/api/auth/{login,logout}/route.ts`.
- **Yönlendirme:** `proxy.ts` (Next 16'da `middleware` yerine `proxy` konvansiyonu) cookie doğrular, korumalı sayfaları `/login`'e yönlendirir.
- Korumalı sayfalar `app/(dashboard)/` route grubunda; `layout.tsx` `isAuthenticated()` kontrolü yapar, `AppShell` (sidebar+header+tema+çıkış) sarmalar.
- Tarih yardımcıları `lib/utils.ts` (`toDateKey`, `getWeekStart`, `formatTrDate`, `formatCurrency`) — yerel saat, UTC kayması yok. DB tarafında `@db.Date` alanları `new Date(toDateKey())` ile sorgulanır.

## Durum
- ✅ Faz 1: altyapı, auth, dashboard, rutinler, görevler
- ✅ Faz 2: Projeler (CRUD + detay: ilerleme%/harcama, görev/gider ekleme), Finans (gelir/gider, aylık özet, kategori grafiği `components/finance/CategoryBar.tsx`, bütçe uyarısı, Alvo hakediş). Görevlere proje bağlama eklendi. Dashboard aylık net bakiye gösteriyor. Grafikler harici kütüphane olmadan (custom SVG/bar).
- ✅ Faz 3: Pomodoro (`components/pomodoro/PomodoroProvider.tsx` context + localStorage kalıcılık, AppShell içinde sarmalı; `PomodoroWidget` yüzen geri sayım; görevden başlatma, bitince görev COMPLETED — `window` event `pomodoro:completed`). Hızlı Not (`components/shared/QuickCapture.tsx` her sayfada FAB). Notlar (`/notes` listele/ara/düzenle/sil, üstte her zaman görünür giriş). API: `/api/notes`, `/api/pomodoro`.
- ✅ Faz 4: AI (Gemini). `lib/gemini.ts` — `@google/genai` SDK, model **`gemini-2.5-flash`** (2.0-flash ücretsiz kotası dolduğu için; `generateText`/`generateJSON`). Endpoint'ler `app/api/ai/*`: `parse` (NLP → finans+görev uygula), `daily-summary` (GET), `weekly-score` (GET/POST, `weekly_scores`'a upsert), `organize-notes` (öneri+uygula). UI: `components/ai/AICommand.tsx` (dashboard NL komut + günlük özet), `WeeklyScoreWidget.tsx`. Notlarda "AI ile düzenle". Cron: `vercel.json` (günlük 18:00 UTC=21:00 TR, haftalık Pazar). Cron auth: `CRON_SECRET` Bearer veya oturum.
- ✅ Faz 5: PWA (bağımlılıksız — `next-pwa` Next16/Turbopack uyumsuz). `app/manifest.ts` (metadata route → `/manifest.webmanifest`), `public/sw.js` (network-first sayfa, stale-while-revalidate diğer GET; offline son veri), `components/shared/ServiceWorkerRegister.tsx` (yalnız production). İkonlar `public/icons/*` `scripts/gen-icons.mjs` ile üretildi (zlib, bağımlılıksız). Rutin profilleri: `/api/routine-profiles` (GET/POST/PATCH activate/DELETE), RoutinesView'da profil değiştirici (tek aktif profil; aktif olan silinemez).

## PWA notu
SW yalnızca production'da kayıt olur. PWA kurulumu/offline testi için: `npm run build && npm run start` (localhost'ta HTTPS gerekmez). `npm run dev`'de SW kapalı.

## Komutlar
- `npm run dev` · `npm run build` · `npx tsc --noEmit`
- `npm run db:push` (şema) · `npm run db:seed` (veri) · `npm run db:studio` (görsel)

## Deploy (Vercel)
- Canlı: **https://personal-life-os-ashen.vercel.app** · proje: `dervist99-1459s-projects/personal-life-os`
- CLI ile deploy (Git'e bağlı değil): `npx vercel --prod`
- Production env değişkenleri Vercel'de ekli (DATABASE_URL, DIRECT_URL, AUTH_SECRET, APP_PASSWORD, GEMINI_API_KEY, CRON_SECRET). Toplu güncelleme: `node scripts/push-env.mjs` (önce `npx vercel link`).
- Cron'lar `vercel.json` ile production'da aktif; Vercel `Authorization: Bearer CRON_SECRET` gönderir.
- Şema değişirse: `npm run db:push` (Neon'a) sonra yeniden deploy. Otomatik git-deploy için repoyu GitHub'a bağlamak gerekir (şu an CLI deploy).
