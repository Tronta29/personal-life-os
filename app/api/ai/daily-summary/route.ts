import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";
import { generateText } from "@/lib/gemini";
import { toDateKey } from "@/lib/utils";

/** Oturum açık kullanıcı VEYA geçerli CRON_SECRET ile erişim */
async function authorize(req: NextRequest) {
  if (await isAuthenticated()) return true;
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req)))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const today = new Date(toDateKey());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Rutinler
  const profile = await prisma.routineProfile.findFirst({
    where: { is_active: true },
    select: { id: true, name: true },
  });
  let routinesTotal = 0;
  let routinesDone = 0;
  if (profile) {
    const ids = (
      await prisma.routine.findMany({
        where: { profile_id: profile.id, is_active: true },
        select: { id: true },
      })
    ).map((r) => r.id);
    routinesTotal = ids.length;
    if (ids.length) {
      routinesDone = await prisma.routineCompletion.count({
        where: { completed_date: today, is_completed: true, routine_id: { in: ids } },
      });
    }
  }

  // Görevler (bugün tamamlanan + bekleyen)
  const [tasksCompletedToday, pendingTasks] = await Promise.all([
    prisma.task.findMany({
      where: { status: "COMPLETED", updated_at: { gte: today, lt: tomorrow } },
      select: { title: true },
    }),
    prisma.task.findMany({
      where: { status: { in: ["TODO", "IN_PROGRESS"] } },
      select: { title: true },
    }),
  ]);

  const stats = {
    profile: profile?.name ?? null,
    routinesDone,
    routinesTotal,
    tasksCompleted: tasksCompletedToday.map((t) => t.title),
    tasksPending: pendingTasks.map((t) => t.title),
  };

  const prompt = `Sen samimi bir kişisel asistansın. Aşağıdaki günlük verilere bakarak Türkçe, kısa (2-4 cümle), motive edici bir günlük değerlendirme yaz. Madde işareti kullanma, doğal konuş.

Aktif profil: ${stats.profile ?? "yok"}
Tamamlanan rutin: ${routinesDone}/${routinesTotal}
Bugün tamamlanan görevler: ${stats.tasksCompleted.join(", ") || "yok"}
Bekleyen görevler: ${stats.tasksPending.join(", ") || "yok"}`;

  let summary = "";
  try {
    summary = await generateText(prompt);
  } catch (e) {
    return NextResponse.json(
      { error: "AI özet hatası: " + (e as Error).message, stats },
      { status: 502 }
    );
  }

  return NextResponse.json({ summary, stats });
}
