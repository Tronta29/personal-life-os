import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

function serialize(t: {
  amount: Prisma.Decimal;
  [k: string]: unknown;
}) {
  return { ...t, amount: Number(t.amount) };
}

// GET /api/finance/transactions?month=YYYY-MM&type=&project_id=&category_id=
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const where: Prisma.FinanceTransactionWhereInput = {};

  const month = sp.get("month"); // YYYY-MM
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    where.transaction_date = { gte: start, lt: end };
  }
  const type = sp.get("type");
  const projectId = sp.get("project_id");
  const categoryId = sp.get("category_id");
  const paymentMethod = sp.get("payment_method");
  if (type) where.type = type as Prisma.FinanceTransactionWhereInput["type"];
  if (projectId) where.project_id = projectId;
  if (categoryId) where.category_id = categoryId;
  if (paymentMethod) where.payment_method = paymentMethod;

  const data = await prisma.financeTransaction.findMany({
    where,
    orderBy: { transaction_date: "desc" },
    include: {
      project: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(data.map(serialize));
}

// POST /api/finance/transactions
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0)
    return NextResponse.json({ error: "Geçerli tutar gir" }, { status: 400 });
  if (body.type !== "INCOME" && body.type !== "EXPENSE")
    return NextResponse.json({ error: "Tür hatalı" }, { status: 400 });

  const created = await prisma.financeTransaction.create({
    data: {
      type: body.type,
      amount,
      currency: body.currency || "TRY",
      description: body.description?.trim() || null,
      client_name: body.client_name?.trim() || null,
      is_paid: body.is_paid ?? true,
      payment_method: body.payment_method || "CASH",
      category_id: body.category_id || null,
      project_id: body.project_id || null,
      transaction_date: body.transaction_date
        ? new Date(body.transaction_date)
        : new Date(),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(serialize(created), { status: 201 });
}

// PATCH /api/finance/transactions → { id, ...alanlar (örn. is_paid) }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if ("is_paid" in body) data.is_paid = body.is_paid;
  if ("payment_method" in body) data.payment_method = body.payment_method;
  if ("description" in body) data.description = body.description;
  if ("amount" in body) data.amount = Number(body.amount);
  if ("category_id" in body) data.category_id = body.category_id || null;
  if ("project_id" in body) data.project_id = body.project_id || null;

  const updated = await prisma.financeTransaction.update({
    where: { id },
    data,
    include: {
      project: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, color: true } },
    },
  });
  return NextResponse.json(serialize(updated));
}

// DELETE /api/finance/transactions?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.financeTransaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
