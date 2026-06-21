import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";
import { toDateKey } from "@/lib/utils";

function dk(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}
function shiftKey(key: string, days: number) {
  const [y, m, dd] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd + days));
  return dk(d);
}

/** Tüm loglardan current/longest streak ve son tamamlama tarihini hesaplar */
function computeStreaks(keys: string[]) {
  const set = new Set(keys);
  if (set.size === 0) return { current: 0, longest: 0, last: null as string | null };

  const sorted = [...set].sort();
  // En uzun ardışık seri
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (shiftKey(sorted[i - 1], 1) === sorted[i]) run++;
    else run = 1;
    if (run > longest) longest = run;
  }

  // Güncel seri (bugün veya dün ile biten)
  const today = toDateKey();
  let anchor: string | null = null;
  if (set.has(today)) anchor = today;
  else if (set.has(shiftKey(today, -1))) anchor = shiftKey(today, -1);

  let current = 0;
  if (anchor) {
    let cursor = anchor;
    while (set.has(cursor)) {
      current++;
      cursor = shiftKey(cursor, -1);
    }
  }

  return { current, longest, last: sorted[sorted.length - 1] };
}

// POST /api/habits/toggle → { habit_id } bugünü aç/kapat
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const habit_id = body.habit_id as string;
  if (!habit_id)
    return NextResponse.json({ error: "habit_id gerekli" }, { status: 400 });

  const todayKey = toDateKey();
  const today = new Date(todayKey);

  const existing = await prisma.habitLog.findUnique({
    where: { habit_id_completed_date: { habit_id, completed_date: today } },
  });

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitLog.create({ data: { habit_id, completed_date: today } });
  }

  const logs = await prisma.habitLog.findMany({
    where: { habit_id },
    select: { completed_date: true },
  });
  const { current, longest, last } = computeStreaks(logs.map((l) => dk(l.completed_date)));

  const habit = await prisma.habit.update({
    where: { id: habit_id },
    data: {
      current_streak: current,
      longest_streak: longest,
      last_completed_date: last ? new Date(last) : null,
    },
  });

  return NextResponse.json({ ...habit, completed_today: !existing });
}
