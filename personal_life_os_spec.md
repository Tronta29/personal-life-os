# Personal Life OS — Claude Code Spec Dokümanı
> Bu dokümanı Claude Code CLI'a direkt yapıştır ve "Faz 1'den başla" de.

---

## PROJE ÖZETİ

Tek kullanıcılı (sadece ben), yapay zeka destekli kişisel yaşam yönetim sistemi.
Web tabanlı, PWA olarak telefon ve tablete ana ekrandan kurulacak. Store yok, APK yok.

---

## TEKNOLOJİ YIĞINI (KESİNLEŞTİ)

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Dil | TypeScript |
| Stil | Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes (ayrı server yok) |
| Veritabanı | Supabase (PostgreSQL) |
| Auth | Supabase Auth (tek kullanıcı, email+şifre) |
| AI | Google Gemini 2.0 Flash API (ücretsiz tier) |
| Deploy | Vercel |
| PWA | next-pwa plugin |

---

## MODÜLLER VE ÖZELLİKLER

### 1. Günlük Rutinler
- Her gün otomatik oluşan rutin listesi (diş fırçala, egzersiz, ilaç vb.)
- Tik atma sistemi (tamamlandı / tamamlanmadı)
- Rutin profilleri: **Normal Hafta**, **Tez Modu**, **Sınav Haftası** — profil değişince rutin seti otomatik değişiyor
- Akşam 21:00'de otomatik özet: "Bugün 7/10 rutin tamamlandı"

### 2. Görev & Takvim
- Görev oluştur: başlık, açıklama, kategori, öncelik, tarih
- Kategoriler: Tez, Alvo Studio, SocialMind, Kişisel, Diğer
- Durum geçişleri: TODO → IN_PROGRESS → DONE / İPTAL / ERTELENDİ
- İptal edince sebep sor (AI yeniden planlama için saklanır)
- Görev içinden **Pomodoro Timer** başlatma (25dk varsayılan, ayarlanabilir)
- Pomodoro bitince görev otomatik "tamamlandı" olarak işaretlenir

### 3. Projeler
- Proje oluştur: isim, renk, açıklama, durum (Aktif / Beklemede / Tamamlandı)
- Varsayılan projeler: SocialMind, Alvo Studio, Tez, Borsa Takip, Kişisel
- Görevler projeye bağlanabilir
- Harcamalar projeye bağlanabilir
- Proje sayfasında: ilerleme yüzdesi (tamamlanan/toplam görev), toplam harcama

### 4. Finans
- Gelir / Gider girişi: tutar, kategori, proje bağlantısı (isteğe bağlı), açıklama, tarih
- **Alvo Studio gelir takibi:** müşteri adı, proje adı, tutar, ödendi mi? (boolean)
- Aylık özet: toplam gelir, toplam gider, net bakiye
- Kategori bazlı dağılım (grafik)
- Bütçe limiti uyarısı (kategori bazlı)
- Para birimi: TRY varsayılan

### 5. Hızlı Not (Capture)
- Ana ekranda her zaman görünür bir input alanı
- Sadece yaz ve kaydet — kategori/etiket zorunlu değil
- Arama yapılabilir
- AI günde bir kez organize etsin: hangi klasöre/projeye gider önerisi

### 6. AI Katmanı (Gemini 2.0 Flash)
- **NLP Parser:** Tek cümleyle hem finansa hem takvime dokunma
  - Örnek: "Yemeğe 2400 TL harcadım, akşamki tez bloğumu iptal et yarına kaydır"
  - Çıktı: JSON → finans transaction + görev güncellemesi aynı anda
- **Günlük Özet (akşam):** Tamamlanan rutinler, görevler, genel değerlendirme
- **Haftalık Skor:** Pazar akşamı — rutin + görev kombinasyonu, yüzdelik skor
- **Not Organizasyonu:** Kategorisiz notları analiz edip klasörleme önerisi

---

## VERİTABANI ŞEMASI (SUPABASE)

```sql
-- KULLANICI (Supabase Auth kullanılıyor, ayrıca users tablosu gerekmez)
-- auth.users tablosu otomatik oluşturulur

-- RUTİN PROFİLLERİ
CREATE TABLE routine_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- 'Normal', 'Tez Modu', 'Sınav'
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RUTİNLER
CREATE TABLE routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  profile_id UUID REFERENCES routine_profiles(id),
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- GÜNLÜK RUTİN TAMAMLAMA KAYITLARI
CREATE TABLE routine_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID REFERENCES routines(id),
  completed_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(routine_id, completed_date)
);

-- PROJEler
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3182ce', -- hex renk
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, ON_HOLD, COMPLETED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- GÖREVLER
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE task_category AS ENUM ('Tez', 'Alvo Studio', 'SocialMind', 'Kişisel', 'Diğer');

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status task_status DEFAULT 'TODO',
  priority task_priority DEFAULT 'MEDIUM',
  category task_category DEFAULT 'Kişisel',
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  cancelled_reason TEXT,
  postponed_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- POMODORO SEANSLAR
CREATE TABLE pomodoro_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  duration_minutes INT DEFAULT 25,
  break_minutes INT DEFAULT 5,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- FİNANS KATEGORİLERİ
CREATE TABLE finance_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  monthly_budget_limit NUMERIC(12, 2) DEFAULT 0.00,
  color VARCHAR(7) DEFAULT '#718096'
);

-- FİNANS İŞLEMLERİ
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE finance_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id), -- isteğe bağlı
  category_id UUID REFERENCES finance_categories(id),
  type transaction_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  description TEXT,
  client_name VARCHAR(100), -- Alvo Studio müşteri takibi için
  is_paid BOOLEAN DEFAULT TRUE, -- Alvo hakediş takibi için
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- NOTLAR
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id), -- AI organize edince atanabilir
  title VARCHAR(255),
  content TEXT NOT NULL,
  is_organized BOOLEAN DEFAULT FALSE, -- AI işleyip işlemediği
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- HAFTALIK SKORLAR
CREATE TABLE weekly_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  routines_total INT DEFAULT 0,
  routines_completed INT DEFAULT 0,
  tasks_total INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  score_percent NUMERIC(5, 2) DEFAULT 0.00,
  ai_summary TEXT, -- Gemini tarafından yazılan haftalık yorum
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## GEMİNİ AI ENTEGRASYONU

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

export { model }
```

### NLP Parser Prompt Şablonu
```
Sen bir kişisel asistansın. Kullanıcının Türkçe metnini analiz et ve aşağıdaki JSON formatında çıktı ver.
Sadece JSON döndür, başka hiçbir şey yazma.

Metin: "{kullanicinin_metni}"

Format:
{
  "finance_transaction": {
    "type": "INCOME" veya "EXPENSE" veya null,
    "amount": sayı veya null,
    "description": "string",
    "category": "string"
  } veya null,
  "task_modification": {
    "action": "CANCEL" veya "POSTPONE" veya "CREATE" veya null,
    "task_query": "ilgili görev anahtar kelimesi",
    "new_date": "YYYY-MM-DD" veya null,
    "reason": "string"
  } veya null
}
```

---

## PROJE KLASÖR YAPISI

```
personal-life-os/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + Header
│   │   ├── page.tsx            # Ana sayfa (bugünün özeti)
│   │   ├── routines/
│   │   │   └── page.tsx
│   │   ├── tasks/
│   │   │   └── page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── finance/
│   │   │   └── page.tsx
│   │   └── notes/
│   │       └── page.tsx
│   └── api/
│       ├── routines/
│       │   └── route.ts
│       ├── tasks/
│       │   └── route.ts
│       ├── projects/
│       │   └── route.ts
│       ├── finance/
│       │   └── route.ts
│       ├── notes/
│       │   └── route.ts
│       └── ai/
│           ├── parse/
│           │   └── route.ts    # NLP parser endpoint
│           ├── daily-summary/
│           │   └── route.ts
│           └── weekly-score/
│               └── route.ts
├── components/
│   ├── ui/                     # shadcn bileşenleri
│   ├── routines/
│   ├── tasks/
│   ├── projects/
│   ├── finance/
│   ├── notes/
│   ├── pomodoro/
│   └── shared/
│       ├── QuickCapture.tsx    # Ana ekrandaki hızlı not input
│       └── Sidebar.tsx
├── lib/
│   ├── supabase.ts
│   ├── gemini.ts
│   └── utils.ts
├── types/
│   └── index.ts
└── public/
    ├── manifest.json           # PWA için
    └── icons/                  # PWA ikonları
```

---

## ORTAM DEĞİŞKENLERİ (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

---

## GELİŞTİRME FAZLARI

### Faz 1 — Temel Altyapı (Önce Bu)
1. Next.js 14 + TypeScript + Tailwind + shadcn/ui kurulumu
2. Supabase bağlantısı ve veritabanı tablolarını oluştur
3. Supabase Auth ile login sayfası (email + şifre)
4. Dashboard layout: sidebar + header
5. **Rutinler modülü:** listeleme, tik atma, yeni rutin ekleme
6. **Görevler modülü:** CRUD, durum değiştirme

### Faz 2 — Projeler & Finans
1. Projeler modülü: CRUD, görev bağlama, ilerleme yüzdesi
2. Finans modülü: gelir/gider girişi, Alvo müşteri takibi, aylık özet grafik

### Faz 3 — Pomodoro & Notlar
1. Pomodoro timer bileşeni (görev içinden başlatma)
2. Hızlı Capture bileşeni (her sayfada görünür)
3. Notlar sayfası: listeleme, arama

### Faz 4 — AI Entegrasyonu
1. Gemini SDK kurulumu
2. NLP parser API endpoint
3. Günlük özet (akşam 21:00 tetikleyici)
4. Haftalık skor hesaplama + Gemini yorumu
5. Not organizasyonu önerisi

### Faz 5 — PWA & Rutin Profilleri
1. next-pwa kurulumu
2. manifest.json + ikonlar
3. Rutin profilleri (Normal / Tez Modu / Sınav)
4. Profil değiştirme UI'ı

---

## ANA SAYFA (DASHBOARD) İÇERİĞİ

Her gün açılınca görmek istediğim:
- Bugünün tarihi + aktif rutin profili
- Rutin tamamlama durumu (X/Y tamamlandı, progress bar)
- Bugünkü görevler listesi (öncelik sıralı)
- Hızlı Capture input (her zaman görünür)
- Bu haftanın skoru (mini widget)
- Aylık net bakiye (mini widget)
- Aktif Pomodoro timer (varsa)

---

## NOTLAR

- Mobil öncelikli tasarım (telefonda rahat kullanılmalı)
- Dark mode destekli (shadcn/ui ile kolay)
- Türkçe arayüz
- PWA: offline'da rutinler ve notlar görüntülenebilir
- Tek kullanıcı: Row Level Security (RLS) gerekmez, basit tutulur
