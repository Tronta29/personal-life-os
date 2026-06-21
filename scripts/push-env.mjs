// .env.local'daki deploy değişkenlerini Vercel'e (production) ekler.
// Kullanım: node scripts/push-env.mjs   (önce `npx vercel login` ve `npx vercel link` yapılmış olmalı)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "APP_PASSWORD",
  "GEMINI_API_KEY",
  "CRON_SECRET",
];

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let val = m[2].trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  )
    val = val.slice(1, -1);
  env[m[1]] = val;
}

// Windows'ta .cmd çalıştırmak için shell:true gerekir
for (const key of KEYS) {
  const value = env[key];
  if (!value) {
    console.log(`- atlandı (boş): ${key}`);
    continue;
  }
  // Önce varsa kaldır (idempotent), sonra ekle
  spawnSync(`npx vercel env rm ${key} production -y`, {
    stdio: "ignore",
    shell: true,
  });
  const r = spawnSync(`npx vercel env add ${key} production`, {
    input: value + "\n",
    encoding: "utf8",
    shell: true,
  });
  console.log(
    r.status === 0 ? `✓ eklendi: ${key}` : `✗ HATA: ${key}\n${r.stderr ?? r.error}`
  );
}
console.log("Bitti.");
