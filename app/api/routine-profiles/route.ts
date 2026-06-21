import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// GET /api/routine-profiles → tüm profiller (aktiflik + rutin sayısı)
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const profiles = await prisma.routineProfile.findMany({
    orderBy: { created_at: "asc" },
    include: { _count: { select: { routines: { where: { is_active: true } } } } },
  });

  return NextResponse.json(
    profiles.map((p) => ({
      id: p.id,
      name: p.name,
      is_active: p.is_active,
      routine_count: p._count.routines,
    }))
  );
}

// POST /api/routine-profiles → { name }
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });

  const data = await prisma.routineProfile.create({ data: { name } });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/routine-profiles → { id, name?, activate? }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  if (body.activate) {
    // Yalnızca bir profil aktif olabilir
    await prisma.$transaction([
      prisma.routineProfile.updateMany({ data: { is_active: false } }),
      prisma.routineProfile.update({ where: { id }, data: { is_active: true } }),
    ]);
  }

  if (typeof body.name === "string" && body.name.trim()) {
    await prisma.routineProfile.update({
      where: { id },
      data: { name: body.name.trim() },
    });
  }

  const updated = await prisma.routineProfile.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

// DELETE /api/routine-profiles?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const target = await prisma.routineProfile.findUnique({ where: { id } });
  if (target?.is_active)
    return NextResponse.json(
      { error: "Aktif profil silinemez" },
      { status: 400 }
    );

  await prisma.routineProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
