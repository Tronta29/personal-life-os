import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// GET /api/goals
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const data = await prisma.goal.findMany({
    orderBy: [{ status: "asc" }, { created_at: "desc" }],
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json(data);
}

// POST /api/goals
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });

  const data = await prisma.goal.create({
    data: {
      title,
      description: body.description?.trim() || null,
      type: body.type || "NUMERIC",
      target_value: body.target_value != null ? Number(body.target_value) : null,
      current_value: body.current_value != null ? Number(body.current_value) : 0,
      target_date: body.target_date ? new Date(body.target_date) : null,
      project_id: body.project_id || null,
    },
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/goals → { id, ...alanlar }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const data: Prisma.GoalUpdateInput = {};
  if ("title" in body) data.title = body.title;
  if ("description" in body) data.description = body.description;
  if ("type" in body) data.type = body.type;
  if ("status" in body) data.status = body.status;
  if ("target_value" in body)
    data.target_value = body.target_value != null ? Number(body.target_value) : null;
  if ("current_value" in body) data.current_value = Number(body.current_value);
  if ("target_date" in body)
    data.target_date = body.target_date ? new Date(body.target_date) : null;
  if ("project_id" in body)
    data.project = body.project_id
      ? { connect: { id: body.project_id } }
      : { disconnect: true };

  // NUMERIC hedef değere ulaşınca otomatik tamamla
  if ("current_value" in body && !("status" in body)) {
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (
      goal?.type === "NUMERIC" &&
      goal.target_value != null &&
      Number(body.current_value) >= goal.target_value
    ) {
      data.status = "COMPLETED";
    }
  }

  const updated = await prisma.goal.update({
    where: { id },
    data,
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json(updated);
}

// DELETE /api/goals?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
