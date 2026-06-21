import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// GET /api/finance/categories
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const categories = await prisma.financeCategory.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    categories.map((c) => ({
      ...c,
      monthly_budget_limit: Number(c.monthly_budget_limit),
    }))
  );
}

// POST /api/finance/categories → { name, color?, monthly_budget_limit? }
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });

  const data = await prisma.financeCategory.create({
    data: {
      name,
      color: body.color || "#718096",
      monthly_budget_limit: body.monthly_budget_limit ?? 0,
    },
  });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/finance/categories → { id, monthly_budget_limit?, color?, name? }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if ("name" in body) data.name = body.name;
  if ("color" in body) data.color = body.color;
  if ("monthly_budget_limit" in body)
    data.monthly_budget_limit = body.monthly_budget_limit;

  const updated = await prisma.financeCategory.update({ where: { id }, data });
  return NextResponse.json(updated);
}
