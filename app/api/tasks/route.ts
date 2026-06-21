import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// GET /api/tasks?status=&category=&project_id=
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const where: Prisma.TaskWhereInput = {};
  const status = sp.get("status");
  const category = sp.get("category");
  const projectId = sp.get("project_id");
  if (status) where.status = status as Prisma.TaskWhereInput["status"];
  if (category) where.category = category;
  if (projectId) where.project_id = projectId;

  const data = await prisma.task.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json(data);
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });

  const data = await prisma.task.create({
    data: {
      title,
      description: body.description?.trim() || null,
      status: body.status || "TODO",
      priority: body.priority || "MEDIUM",
      category: body.category || "Kişisel",
      project_id: body.project_id || null,
      start_time: body.start_time ? new Date(body.start_time) : null,
      end_time: body.end_time ? new Date(body.end_time) : null,
    },
    include: { project: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/tasks → { id, ...alanlar }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const data: Prisma.TaskUpdateInput = {};
  if ("title" in body) data.title = body.title;
  if ("description" in body) data.description = body.description;
  if ("status" in body) data.status = body.status;
  if ("priority" in body) data.priority = body.priority;
  if ("category" in body) data.category = body.category;
  if ("cancelled_reason" in body) data.cancelled_reason = body.cancelled_reason;
  if ("start_time" in body)
    data.start_time = body.start_time ? new Date(body.start_time) : null;
  if ("end_time" in body)
    data.end_time = body.end_time ? new Date(body.end_time) : null;
  if ("project_id" in body) {
    data.project = body.project_id
      ? { connect: { id: body.project_id } }
      : { disconnect: true };
  }

  // Erteleme sayacı: POSTPONED'a geçişte artır
  if (body.status === "POSTPONED" && body.incrementPostpone) {
    data.postponed_count = { increment: 1 };
  }

  const updated = await prisma.task.update({
    where: { id },
    data,
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json(updated);
}

// DELETE /api/tasks?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
