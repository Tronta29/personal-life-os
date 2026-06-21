import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";
import { generateJSON } from "@/lib/gemini";
import { toDateKey } from "@/lib/utils";

type ParseResult = {
  finance_transaction: {
    type: "INCOME" | "EXPENSE" | null;
    amount: number | null;
    description: string | null;
    category: string | null;
  } | null;
  task_modification: {
    action: "CANCEL" | "POSTPONE" | "CREATE" | null;
    task_query: string | null;
    new_date: string | null;
    reason: string | null;
  } | null;
};

function buildPrompt(text: string, today: string) {
  return `Sen bir kişisel asistansın. Bugünün tarihi: ${today}.
Kullanıcının Türkçe metnini analiz et ve SADECE aşağıdaki JSON formatında çıktı ver. Başka hiçbir şey yazma.

Metin: "${text}"

Format:
{
  "finance_transaction": {
    "type": "INCOME" veya "EXPENSE" veya null,
    "amount": sayı veya null,
    "description": "string",
    "category": "string"
  } veya null,
  "task_modification": {
    "action": "CANCEL" veya "POSTPONE" veya "CREATE" veya null,
    "task_query": "ilgili görev anahtar kelimesi",
    "new_date": "YYYY-MM-DD" veya null,
    "reason": "string"
  } veya null
}

Kurallar:
- Tutar her zaman sayı (TL/lira gibi kelimeleri çıkar).
- Tarihler YYYY-MM-DD biçiminde; "yarın", "bugün" gibi ifadeleri ${today} tarihine göre hesapla.
- Metinde finans yoksa finance_transaction null; görev işlemi yoksa task_modification null.
- category için kısa Türkçe bir kategori adı üret (örn. "Yemek", "Ulaşım").`;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Metin gerekli" }, { status: 400 });

  let parsed: ParseResult;
  try {
    parsed = await generateJSON<ParseResult>(buildPrompt(text, toDateKey()));
  } catch (e) {
    return NextResponse.json(
      { error: "AI ayrıştırma hatası: " + (e as Error).message },
      { status: 502 }
    );
  }

  const applied: string[] = [];

  // 1) Finans işlemi
  const ft = parsed.finance_transaction;
  if (ft && ft.type && ft.amount && ft.amount > 0) {
    let category_id: string | null = null;
    if (ft.category) {
      const existing = await prisma.financeCategory.findFirst({
        where: { name: { equals: ft.category, mode: "insensitive" } },
      });
      category_id = existing
        ? existing.id
        : (await prisma.financeCategory.create({ data: { name: ft.category } })).id;
    }
    await prisma.financeTransaction.create({
      data: {
        type: ft.type,
        amount: ft.amount,
        description: ft.description || null,
        category_id,
      },
    });
    applied.push(
      `${ft.type === "INCOME" ? "Gelir" : "Gider"} eklendi: ${ft.amount} TRY${
        ft.category ? ` (${ft.category})` : ""
      }`
    );
  }

  // 2) Görev işlemi
  const tm = parsed.task_modification;
  if (tm && tm.action) {
    if (tm.action === "CREATE" && tm.task_query) {
      await prisma.task.create({
        data: {
          title: tm.task_query,
          start_time: tm.new_date ? new Date(tm.new_date) : null,
        },
      });
      applied.push(`Görev oluşturuldu: "${tm.task_query}"`);
    } else if (tm.task_query) {
      const task = await prisma.task.findFirst({
        where: {
          title: { contains: tm.task_query, mode: "insensitive" },
          status: { in: ["TODO", "IN_PROGRESS", "POSTPONED"] },
        },
        orderBy: { created_at: "desc" },
      });
      if (!task) {
        applied.push(`"${tm.task_query}" ile eşleşen aktif görev bulunamadı.`);
      } else if (tm.action === "CANCEL") {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: "CANCELLED", cancelled_reason: tm.reason || null },
        });
        applied.push(`Görev iptal edildi: "${task.title}"`);
      } else if (tm.action === "POSTPONE") {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: "POSTPONED",
            postponed_count: { increment: 1 },
            start_time: tm.new_date ? new Date(tm.new_date) : task.start_time,
          },
        });
        applied.push(
          `Görev ertelendi: "${task.title}"${tm.new_date ? ` → ${tm.new_date}` : ""}`
        );
      }
    }
  }

  if (applied.length === 0) applied.push("Uygulanacak bir işlem bulunamadı.");

  return NextResponse.json({ parsed, applied });
}
