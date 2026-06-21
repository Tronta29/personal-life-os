import { GoogleGenAI } from "@google/genai";

// 2.5-flash: güncel ve ücretsiz kotası 2.0-flash'tan ayrı (2.0 kotası dolunca buna geçildi)
export const GEMINI_MODEL = "gemini-2.5-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil (.env.local)");
  return new GoogleGenAI({ apiKey });
}

/** Düz metin üretir */
export async function generateText(prompt: string): Promise<string> {
  const ai = client();
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });
  return res.text ?? "";
}

function stripFences(text: string): string {
  let t = text.trim();
  // ```json ... ``` veya ``` ... ``` çitlerini temizle
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return t.trim();
}

/** JSON çıktısı üretir ve parse eder */
export async function generateJSON<T>(prompt: string): Promise<T> {
  const ai = client();
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  const text = res.text ?? "";
  return JSON.parse(stripFences(text)) as T;
}
