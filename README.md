# Personal Life OS

Tek kullanıcılı, yapay zeka destekli kişisel yaşam yönetim sistemi (PWA).

## Teknolojiler
- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** + el yapımı shadcn-uyumlu UI
- **Neon (PostgreSQL) + Prisma 6**
- Basit **cookie tabanlı auth** (tek kullanıcı)
- **Google Gemini** (`gemini-2.5-flash`)
- **PWA** (native service worker)
- Deploy: **Vercel**

## Modüller
- Günlük rutinler + profiller (Normal / Tez Modu / Sınav Haftası)
- Görevler (durum geçişleri, Pomodoro, iptal sebebi)
- Projeler (ilerleme %, harcama takibi)
- Finans (gelir/gider, aylık özet, kategori grafiği, bütçe uyarısı, hakediş)
- Hızlı not + Notlar (arama, AI klasörleme)
- AI asistan (doğal dil komut, günlük özet, haftalık skor)

## Kurulum
Bkz. [`KURULUM.md`](./KURULUM.md). Geliştirici notları: [`CLAUDE.md`](./CLAUDE.md).

```bash
npm install
npm run db:push   # şemayı Neon'a uygula
npm run db:seed   # başlangıç verisi
npm run dev
```
