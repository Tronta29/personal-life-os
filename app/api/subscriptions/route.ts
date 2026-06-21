import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// GET /api/subscriptions
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const data = await prisma.subscription.findMany({
    orderBy: { next_billing_date: "asc" },
  });
  return NextResponse.json(data);
}

// POST /api/subscriptions
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  const amount = Number(body.amount);
  if (!name) return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });
  if (!amount || amount <= 0)
    return NextResponse.json({ error: "Geçerli tutar gir" }, { status: 400 });
  if (!body.next_billing_date)
    return NextResponse.json({ error: "Yenileme tarihi gerekli" }, { status: 400 });

  const data = await prisma.subscription.create({
    data: {
      name,
      amount,
      currency: body.currency || "TRY",
      period: body.period || "MONTHLY",
      next_billing_date: new Date(body.next_billing_date),
      auto_add_expense: body.auto_add_expense ?? true,
      category_id: body.category_id || null,
    },
  });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/subscriptions → { id, ...alanlar }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if ("name" in body) data.name = body.name;
  if ("amount" in body) data.amount = Number(body.amount);
  if ("currency" in body) data.currency = body.currency;
  if ("period" in body) data.period = body.period;
  if ("next_billing_date" in body)
    data.next_billing_date = new Date(body.next_billing_date);
  if ("auto_add_expense" in body) data.auto_add_expense = body.auto_add_expense;
  if ("is_active" in body) data.is_active = body.is_active;
  if ("category_id" in body) data.category_id = body.category_id || null;

  const updated = await prisma.subscription.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/subscriptions?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.subscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
