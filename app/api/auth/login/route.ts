import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionToken, COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

// POST /api/auth/login → { password }
export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));

  if (!process.env.APP_PASSWORD) {
    return NextResponse.json(
      { error: "APP_PASSWORD tanımlı değil (.env.local)" },
      { status: 500 }
    );
  }

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Şifre hatalı." }, { status: 401 });
  }

  const token = await createSessionToken();
  (await cookies()).set(COOKIE_NAME, token, sessionCookieOptions);
  return NextResponse.json({ ok: true });
}
