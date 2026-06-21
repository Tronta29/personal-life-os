import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// GET /api/installments
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const data = await prisma.installment.findMany({
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(data);
}

// POST /api/installments → monthly_amount otomatik hesaplanır
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  const total = Number(body.total_amount);
  const count = parseInt(body.installment_count, 10);
  if (!title) return NextResponse.json({ error: "Ürün adı gerekli" }, { status: 400 });
  if (!total || total <= 0)
    return NextResponse.json({ error: "Geçerli tutar gir" }, { status: 400 });
  if (!count || count <= 0)
    return NextResponse.json({ error: "Taksit sayısı gir" }, { status: 400 });

  const data = await prisma.installment.create({
    data: {
      title,
      total_amount: total,
      installment_count: count,
      monthly_amount: Math.round((total / count) * 100) / 100,
      start_date: body.start_date ? new Date(body.start_date) : new Date(),
      paid_count: body.paid_count ? parseInt(body.paid_count, 10) : 0,
      category_id: body.category_id || null,
    },
  });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/installments → { id, pay?: true, ...alanlar }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const current = await prisma.installment.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.pay === true) {
    data.paid_count = Math.min(current.paid_count + 1, current.installment_count);
  } else if (body.unpay === true) {
    data.paid_count = Math.max(current.paid_count - 1, 0);
  }
  if ("paid_count" in body) data.paid_count = parseInt(body.paid_count, 10);
  if ("title" in body) data.title = body.title;

  const updated = await prisma.installment.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/installments?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.installment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
