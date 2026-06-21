# Personal Life OS — Kurulum (Faz 1)

Yığın: **Next.js 16 + Neon (PostgreSQL) + Prisma + basit cookie auth**.
Uygulamayı çalıştırmak için bir defalık yapılacaklar. Sırayla takip et.

## 1. Neon veritabanı oluştur

1. https://neon.tech → ücretsiz hesap aç → **New Project**.
2. Bölge: **Europe (Frankfurt)** seç (Türkiye'ye en yakın).
3. Proje açılınca **Connection Details** ekranında iki bağlantı dizesi göreceksin:
   - **Pooled connection** (içinde `-pooler` geçer) → `DATABASE_URL`
   - **Direct connection** (pooler yok) → `DIRECT_URL`
   - İkisini de kopyala. (Connection string'in sonunda `?sslmode=require` olmalı.)

## 2. .env.local oluştur

Proje kökünde örneği kopyala:

```bash
cp .env.local.example .env.local
```

Sonra doldur:
- `DATABASE_URL` ve `DIRECT_URL` → Neon'dan aldığın bağlantılar
- `AUTH_SECRET` → rastgele uzun bir string (terminalde: `openssl rand -hex 32`)
- `APP_PASSWORD` → giriş ekranında kullanacağın şifre
- `GEMINI_API_KEY`, `CRON_SECRET` → şimdilik boş/placeholder kalabilir (Faz 4)

## 3. Tabloları oluştur ve başlangıç verisini yükle

```bash
npm install            # bağımlılıklar + prisma client üretimi (postinstall)
npm run db:push        # şemayı Neon'a uygula (tabloları oluşturur)
npm run db:seed        # rutin profilleri, rutinler, projeler, finans kategorileri
```

> `db:push` şemayı doğrudan uygular (migration dosyası üretmez) — prototip için en pratiği.
> Şemayı görsel incelemek istersen: `npm run db:studio`

## 4. Çalıştır

```bash
npm run dev
```

http://localhost:3000 → otomatik `/login`'e yönlenir. `APP_PASSWORD` ile gir.

## PWA — telefona/tablete ana ekrana kurma

Service worker yalnızca **production** modunda çalışır. Test için:

```bash
npm run build
npm run start
```

- **Android (Chrome):** siteyi aç → menü (⋮) → "Ana ekrana ekle" / "Uygulamayı yükle".
- **iOS (Safari):** Paylaş düğmesi → "Ana Ekrana Ekle".
- Telefondan bilgisayarın localhost'una erişmek için aynı Wi-Fi'da `http://<bilgisayar-ip>:3000` (dev çıktısındaki "Network" adresi) kullan; gerçek kullanım için Vercel'e deploy önerilir.

`npm run dev`'de SW kapalıdır (geliştirme sırasında önbellek karışmasın diye).

## Faz 1'de neler var?

- ✅ Giriş (tek kullanıcı, imzalı cookie — şifre `.env.local`'da)
- ✅ Dashboard (bugünün tarihi, aktif profil, rutin ilerlemesi, aktif görevler)
- ✅ Rutinler: listele, tik at, ekle, sil (günlük ilerleme çubuğu)
- ✅ Görevler: oluştur, durum değiştir (Başla/Bitir/Ertele/İptal), iptal sebebi, sil
- ✅ Dark mode + mobil uyumlu
- 🔜 Projeler & Finans (Faz 2), Pomodoro & Notlar (Faz 3), AI (Faz 4), PWA & Profiller (Faz 5)

## Sorun giderme

- **`AUTH_SECRET tanımlı değil`** → `.env.local` doldurup `npm run dev`'i yeniden başlat.
- **Giriş olmuyor** → girdiğin şifre `APP_PASSWORD` ile birebir aynı mı?
- **DB bağlantı hatası** → `DATABASE_URL` pooled, `DIRECT_URL` direct olmalı; sonlarında `?sslmode=require` var mı?
- **"Aktif profilde rutin yok"** → `npm run db:seed` çalıştırdın mı?
