import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";
import { toDateKey } from "@/lib/utils";

// GET /api/habits → aktif alışkanlıklar + bugün tamamlandı mı
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const habits = await prisma.habit.findMany({
    where: { is_active: true },
    orderBy: { created_at: "asc" },
  });

  const ids = habits.map((h) => h.id);
  const todayLogs = ids.length
    ? await prisma.habitLog.findMany({
        where: { completed_date: new Date(toDateKey()), habit_id: { in: ids } },
        select: { habit_id: true },
      })
    : [];
  const doneSet = new Set(todayLogs.map((l) => l.habit_id));

  return NextResponse.json(
    habits.map((h) => ({ ...h, completed_today: doneSet.has(h.id) }))
  );
}

// POST /api/habits → { title, description? }
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });

  const data = await prisma.habit.create({
    data: { title, description: body.description?.trim() || null },
  });
  return NextResponse.json({ ...data, completed_today: false }, { status: 201 });
}

// PATCH /api/habits → { id, title?, description?, is_active? }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if ("title" in body) data.title = body.title;
  if ("description" in body) data.description = body.description;
  if ("is_active" in body) data.is_active = body.is_active;

  const updated = await prisma.habit.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/habits?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.habit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
