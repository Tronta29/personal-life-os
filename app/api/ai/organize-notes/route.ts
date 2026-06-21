import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";
import { generateJSON } from "@/lib/gemini";

type Suggestion = { id: string; project: string | null; reason: string };

// GET → kategorisiz notlar için proje önerisi üretir (mutasyon yok)
export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const notes = await prisma.note.findMany({
    where: { is_organized: false },
    orderBy: { created_at: "desc" },
    take: 30,
    select: { id: true, content: true },
  });
  if (notes.length === 0) return NextResponse.json({ suggestions: [] });

  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  const projectNames = projects.map((p) => p.name);

  const prompt = `Aşağıda kullanıcının kategorisiz notları var. Her notu mevcut projelerden BİRİNE öner ya da uygun değilse null bırak.
Mevcut projeler: ${projectNames.join(", ")}

Notlar (JSON):
${JSON.stringify(notes.map((n) => ({ id: n.id, content: n.content.slice(0, 300) })))}

SADECE şu formatta bir JSON dizisi döndür:
[{ "id": "not_id", "project": "Proje adı veya null", "reason": "kısa Türkçe gerekçe" }]`;

  let raw: Suggestion[];
  try {
    raw = await generateJSON<Suggestion[]>(prompt);
  } catch (e) {
    return NextResponse.json(
      { error: "AI öneri hatası: " + (e as Error).message },
      { status: 502 }
    );
  }

  const nameToId = new Map(projects.map((p) => [p.name.toLowerCase(), p.id]));
  const contentById = new Map(notes.map((n) => [n.id, n.content]));

  const suggestions = (Array.isArray(raw) ? raw : [])
    .filter((s) => contentById.has(s.id))
    .map((s) => ({
      id: s.id,
      content: contentById.get(s.id)!,
      suggested_project_id: s.project ? nameToId.get(s.project.toLowerCase()) ?? null : null,
      suggested_project_name: s.project,
      reason: s.reason,
    }));

  return NextResponse.json({ suggestions });
}

// POST → önerileri uygula. body: { items: [{ note_id, project_id|null }] }
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const items = (body.items ?? []) as { note_id: string; project_id: string | null }[];
  if (!Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: "items gerekli" }, { status: 400 });

  await prisma.$transaction(
    items.map((i) =>
      prisma.note.update({
        where: { id: i.note_id },
        data: { project_id: i.project_id || null, is_organized: true },
      })
    )
  );

  return NextResponse.json({ ok: true, count: items.length });
}
