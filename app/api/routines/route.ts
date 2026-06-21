import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";
import { toDateKey } from "@/lib/utils";

// GET /api/routines?date=YYYY-MM-DD → aktif profilin rutinleri + o günkü tamamlama durumu
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") ?? toDateKey();

  const profile = await prisma.routineProfile.findFirst({
    where: { is_active: true },
    select: { id: true, name: true },
  });
  if (!profile) return NextResponse.json({ profile: null, routines: [] });

  const routines = await prisma.routine.findMany({
    where: { profile_id: profile.id, is_active: true },
    orderBy: { order_index: "asc" },
    select: { id: true, title: true, description: true, order_index: true },
  });

  const ids = routines.map((r) => r.id);
  const completions = ids.length
    ? await prisma.routineCompletion.findMany({
        where: { completed_date: new Date(date), routine_id: { in: ids } },
        select: { routine_id: true, is_completed: true },
      })
    : [];

  const completedMap = new Map(completions.map((c) => [c.routine_id, c.is_completed]));
  const result = routines.map((r) => ({
    ...r,
    is_completed: completedMap.get(r.id) ?? false,
  }));

  return NextResponse.json({ profile, routines: result, date });
}

// POST /api/routines → { title, description? }
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });

  const profile = await prisma.routineProfile.findFirst({
    where: { is_active: true },
    select: { id: true },
  });
  if (!profile)
    return NextResponse.json({ error: "Aktif profil yok" }, { status: 400 });

  const count = await prisma.routine.count({ where: { profile_id: profile.id } });

  const data = await prisma.routine.create({
    data: {
      title,
      description: body.description?.trim() || null,
      profile_id: profile.id,
      order_index: count,
    },
  });

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/routines?id= → rutini pasifleştir
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.routine.update({ where: { id }, data: { is_active: false } });
  return NextResponse.json({ ok: true });
}
