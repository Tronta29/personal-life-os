"use client";

import { usePomodoro } from "@/components/pomodoro/PomodoroProvider";
import { Button } from "@/components/ui/button";
import { Timer, X } from "lucide-react";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Aktif pomodoro varsa her sayfada görünen yüzen geri sayım */
export function PomodoroWidget() {
  const { active, remaining, stop } = usePomodoro();
  if (!active) return null;

  const total = active.durationMinutes * 60;
  const pct = total ? ((total - remaining) / total) * 100 : 0;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-64 rounded-xl border bg-card p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <Timer className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">
            {active.taskTitle}
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {fmt(remaining)}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={stop} aria-label="Durdur">
          <X className="size-4" />
        </Button>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
