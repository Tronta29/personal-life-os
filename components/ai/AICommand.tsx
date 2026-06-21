"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Send, CalendarCheck } from "lucide-react";

export function AICommand() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [applied, setApplied] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setRunning(true);
    setError(null);
    setApplied(null);
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Hata");
      } else {
        setApplied(data.applied ?? []);
        setText("");
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setRunning(false);
  }

  async function summarize() {
    setSummarizing(true);
    setSummary(null);
    try {
      const res = await fetch("/api/ai/daily-summary");
      const data = await res.json();
      setSummary(res.ok ? data.summary : data.error ?? "Hata");
    } catch (err) {
      setSummary((err as Error).message);
    }
    setSummarizing(false);
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-5 text-primary" /> AI Asistan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={run} className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Örn: "Yemeğe 240 TL harcadım, akşamki tez bloğumu yarına ertele"'
            rows={2}
          />
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={summarize}
              disabled={summarizing}
            >
              {summarizing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CalendarCheck className="size-4" />
              )}
              Bugünü özetle
            </Button>
            <Button type="submit" size="sm" disabled={running || !text.trim()}>
              {running ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
              Uygula
            </Button>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {applied && (
          <ul className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            {applied.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">✓</span>
                {a}
              </li>
            ))}
          </ul>
        )}

        {summary && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
            {summary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
