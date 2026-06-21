import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";
import { generateText } from "@/lib/gemini";
import { getWeekStart } from "@/lib/utils";

async function authorize(req: NextRequest) {
  if (await isAuthenticated()) return true;
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  return Boolean(secret && auth === `Bearer ${secret}`);
}

async function computeAndStore() {
  const weekStartKey = getWeekStart();
  const weekStart = new Date(weekStartKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Rutinler: aktif profildeki rutin sayısı * 7 gün
  const profile = await prisma.routineProfile.findFirst({
    where: { is_active: true },
    select: { id: true },
  });
  let routineIds: string[] = [];
  if (profile) {
    routineIds = (
      await prisma.routine.findMany({
        where: { profile_id: profile.id, is_active: true },
        select: { id: true },
      })
    ).map((r) => r.id);
  }
  const routinesTotal = routineIds.length * 7;
  const routinesCompleted = routineIds.length
    ? await prisma.routineCompletion.count({
        where: {
          routine_id: { in: routineIds },
          is_completed: true,
          completed_date: { gte: weekStart, lt: weekEnd },
        },
      })
    : 0;

  // Görevler: bu hafta oluşturulanlar ve tamamlananlar
  const [tasksTotal, tasksCompleted] = await Promise.all([
    prisma.task.count({ where: { created_at: { gte: weekStart, lt: weekEnd } } }),
    prisma.task.count({
      where: {
        created_at: { gte: weekStart, lt: weekEnd },
        status: "COMPLETED",
      },
    }),
  ]);

  const denom = routinesTotal + tasksTotal;
  const scorePercent =
    denom > 0 ? ((routinesCompleted + tasksCompleted) / denom) * 100 : 0;

  const prompt = `Sen samimi bir kişisel asistansın. Bu haftanın performansına bakarak Türkçe, kısa (2-3 cümle) bir haftalık değerlendirme yaz. Doğal konuş, madde kullanma.

Rutin tamamlama: ${routinesCompleted}/${routinesTotal}
Görev tamamlama: ${tasksCompleted}/${tasksTotal}
Genel skor: %${scorePercent.toFixed(0)}`;

  let aiSummary = "";
  try {
    aiSummary = await generateText(prompt);
  } catch {
    aiSummary = "";
  }

  const record = await prisma.weeklyScore.upsert({
    where: { week_start: weekStart },
    update: {
      routines_total: routinesTotal,
      routines_completed: routinesCompleted,
      tasks_total: tasksTotal,
      tasks_completed: tasksCompleted,
      score_percent: Number(scorePercent.toFixed(2)),
      ai_summary: aiSummary,
    },
    create: {
      week_start: weekStart,
      routines_total: routinesTotal,
      routines_completed: routinesCompleted,
      tasks_total: tasksTotal,
      tasks_completed: tasksCompleted,
      score_percent: Number(scorePercent.toFixed(2)),
      ai_summary: aiSummary,
    },
  });

  return { ...record, score_percent: Number(record.score_percent) };
}

// POST → yeniden hesapla ve kaydet
export async function POST(req: NextRequest) {
  if (!(await authorize(req)))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const record = await computeAndStore();
  return NextResponse.json(record);
}

// GET → hesapla ve kaydet (Vercel cron GET ile çağırır)
export async function GET(req: NextRequest) {
  if (!(await authorize(req)))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const record = await computeAndStore();
  return NextResponse.json(record);
}
