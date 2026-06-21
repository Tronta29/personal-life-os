import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-server";
import { toDateKey } from "@/lib/utils";

// POST /api/routines/toggle → { routine_id, date?, is_completed }
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const routine_id = body.routine_id as string;
  const is_completed = Boolean(body.is_completed);
  const date = new Date((body.date as string) || toDateKey());

  if (!routine_id)
    return NextResponse.json({ error: "routine_id gerekli" }, { status: 400 });

  const completed_at = is_completed ? new Date() : null;

  const data = await prisma.routineCompletion.upsert({
    where: { routine_id_completed_date: { routine_id, completed_date: date } },
    update: { is_completed, completed_at },
    create: { routine_id, completed_date: date, is_completed, completed_at },
  });

  return NextResponse.json(data);
}
