import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROFILES: Record<string, { title: string }[]> = {
  Normal: [
    { title: "Su iç (2L)" },
    { title: "Diş fırçala" },
    { title: "Egzersiz / yürüyüş" },
    { title: "Vitamin / ilaç" },
    { title: "30 dk okuma" },
    { title: "Günü planla" },
  ],
  "Tez Modu": [
    { title: "Sabah 2 saat tez bloğu" },
    { title: "Diş fırçala" },
    { title: "Kısa yürüyüş" },
    { title: "Öğleden sonra 2 saat tez bloğu" },
    { title: "Kaynak/literatür okuma" },
  ],
  "Sınav Haftası": [
    { title: "Sabah tekrar (1 saat)" },
    { title: "Diş fırçala" },
    { title: "Konu çalışması (3 saat)" },
    { title: "Soru çözümü (2 saat)" },
    { title: "Erken uyu" },
  ],
};

const PROJECTS = [
  { name: "SocialMind", color: "#8b5cf6" },
  { name: "Alvo Studio", color: "#06b6d4" },
  { name: "Tez", color: "#ef4444" },
  { name: "Borsa Takip", color: "#22c55e" },
  { name: "Kişisel", color: "#f59e0b" },
];

const CATEGORIES = [
  { name: "Yemek", color: "#f97316" },
  { name: "Ulaşım", color: "#3b82f6" },
  { name: "Fatura", color: "#64748b" },
  { name: "Eğlence", color: "#ec4899" },
  { name: "Sağlık", color: "#10b981" },
  { name: "Alvo Geliri", color: "#06b6d4" },
  { name: "Diğer", color: "#718096" },
];

async function main() {
  for (const [name, routines] of Object.entries(PROFILES)) {
    const exists = await prisma.routineProfile.findFirst({ where: { name } });
    if (exists) continue;
    const profile = await prisma.routineProfile.create({
      data: { name, is_active: name === "Normal" },
    });
    await prisma.routine.createMany({
      data: routines.map((r, i) => ({
        title: r.title,
        profile_id: profile.id,
        order_index: i,
      })),
    });
    console.log(`✓ Profil + rutinler: ${name}`);
  }

  for (const p of PROJECTS) {
    const exists = await prisma.project.findFirst({ where: { name: p.name } });
    if (!exists) {
      await prisma.project.create({ data: { name: p.name, color: p.color } });
      console.log(`✓ Proje: ${p.name}`);
    }
  }

  for (const c of CATEGORIES) {
    await prisma.financeCategory.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, color: c.color },
    });
  }
  console.log("✓ Finans kategorileri");
  console.log("Seed tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
