import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";

// GET /api/notes?q=arama
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const where: Prisma.NoteWhereInput = q
    ? {
        OR: [
          { content: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const data = await prisma.note.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: { project: { select: { id: true, name: true, color: true } } },
  });
  return NextResponse.json(data);
}

// POST /api/notes → { content, title? }
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "İçerik gerekli" }, { status: 400 });

  const data = await prisma.note.create({
    data: { content, title: body.title?.trim() || null },
  });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/notes → { id, content?, title?, project_id?, is_organized? }
export async function PATCH(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if ("content" in body) data.content = body.content;
  if ("title" in body) data.title = body.title;
  if ("project_id" in body) data.project_id = body.project_id || null;
  if ("is_organized" in body) data.is_organized = body.is_organized;

  const updated = await prisma.note.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/notes?id=
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
