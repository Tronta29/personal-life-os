import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// GET /api/projects → projeler + istatistik (görev sayısı, tamamlanan, toplam harcama)
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const projects = await prisma.project.findMany({
    orderBy: { created_at: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  const [completed, spend] = await Promise.all([
    prisma.task.groupBy({
      by: ["project_id"],
      where: { status: "COMPLETED", project_id: { not: null } },
      _count: { _all: true },
    }),
    prisma.financeTransaction.groupBy({
      by: ["project_id"],
      where: { type: "EXPENSE", project_id: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const completedMap = new Map(completed.map((c) => [c.project_id, c._count._all]));
  const spendMap = new Map(spend.map((s) => [s.project_id, Number(s._sum.amount ?? 0)]));

  const result = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    status: p.status,
    task_total: p._count.tasks,
    task_completed: completedMap.get(p.id) ?? 0,
    total_spend: spendMap.get(p.id) ?? 0,
  }));

  return NextResponse.json(result);
}

// POST /api/projects
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });

  const data = await prisma.project.create({
    data: {
      name,
      description: body.description?.trim() || null,
      color: body.color || "#3182ce",
      status: body.status || "ACTIVE",
    },
  });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/projects → { id, ...alanlar }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "color", "status"] as const) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.project.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/projects?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
