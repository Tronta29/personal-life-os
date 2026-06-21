"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Loader2, RefreshCw } from "lucide-react";

type Score = {
  score_percent: number;
  routines_completed: number;
  routines_total: number;
  tasks_completed: number;
  tasks_total: number;
  ai_summary: string | null;
};

export function WeeklyScoreWidget({ initial }: { initial: Score | null }) {
  const [data, setData] = useState<Score | null>(initial);
  const [loading, setLoading] = useState(false);

  async function recompute() {
    setLoading(true);
    const res = await fetch("/api/ai/weekly-score", { method: "POST" });
    const json = await res.json();
    if (res.ok) setData(json);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Haftalık Skor</CardTitle>
        <Button variant="ghost" size="icon" onClick={recompute} disabled={loading} aria-label="Hesapla">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-xs text-muted-foreground">
            Henüz hesaplanmadı. ↻ ile hesapla.
          </p>
        ) : (
          <>
            <p className="mb-1 text-2xl font-bold">%{data.score_percent.toFixed(0)}</p>
            <ProgressBar value={data.score_percent} />
            <p className="mt-2 text-xs text-muted-foreground">
              Rutin {data.routines_completed}/{data.routines_total} · Görev{" "}
              {data.tasks_completed}/{data.tasks_total}
            </p>
            {data.ai_summary && (
              <p className="mt-2 text-xs leading-relaxed">{data.ai_summary}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
