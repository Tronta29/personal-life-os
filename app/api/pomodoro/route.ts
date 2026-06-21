import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// POST /api/pomodoro → { task_id?, duration_minutes? } seans başlat
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const session = await prisma.pomodoroSession.create({
    data: {
      task_id: body.task_id || null,
      duration_minutes: body.duration_minutes ?? 25,
      break_minutes: body.break_minutes ?? 5,
      started_at: new Date(),
    },
  });

  // Görevi "devam ediyor" yap
  if (body.task_id) {
    await prisma.task
      .update({ where: { id: body.task_id }, data: { status: "IN_PROGRESS" } })
      .catch(() => {});
  }

  return NextResponse.json(session, { status: 201 });
}

// PATCH /api/pomodoro → { id, completed } seansı tamamla; tamamlandıysa görevi DONE yap
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const completed = Boolean(body.completed);
  const session = await prisma.pomodoroSession.update({
    where: { id },
    data: { completed, ended_at: new Date() },
  });

  if (completed && session.task_id) {
    await prisma.task
      .update({ where: { id: session.task_id }, data: { status: "COMPLETED" } })
      .catch(() => {});
  }

  return NextResponse.json(session);
}

// DELETE /api/pomodoro?id= → seansı iptal/sil
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.pomodoroSession.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
