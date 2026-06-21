"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

const STORAGE_KEY = "plos_pomodoro";

type ActivePomodoro = {
  sessionId: string;
  taskId: string | null;
  taskTitle: string;
  durationMinutes: number;
  endsAt: number; // epoch ms
};

type StartOpts = {
  taskId?: string | null;
  taskTitle: string;
  minutes: number;
};

type PomodoroContextValue = {
  active: ActivePomodoro | null;
  remaining: number; // saniye
  start: (opts: StartOpts) => Promise<void>;
  stop: () => Promise<void>;
};

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
}

function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
      return;
    }
  } catch {
    // yoksay
  }
  // yedek: sayfa içi uyarı
  setTimeout(() => alert(`${title}\n${body}`), 50);
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActivePomodoro | null>(null);
  const [remaining, setRemaining] = useState(0);
  const completingRef = useRef(false);

  const clearActive = useCallback(() => {
    setActive(null);
    setRemaining(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const complete = useCallback(
    async (session: ActivePomodoro) => {
      if (completingRef.current) return;
      completingRef.current = true;
      try {
        await fetch("/api/pomodoro", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: session.sessionId, completed: true }),
        });
      } catch {
        // yoksay
      }
      clearActive();
      notify(
        "Pomodoro tamamlandı 🍅",
        session.taskId
          ? `"${session.taskTitle}" görevi tamamlandı olarak işaretlendi.`
          : "Mola zamanı!"
      );
      window.dispatchEvent(new CustomEvent("pomodoro:completed"));
      completingRef.current = false;
    },
    [clearActive]
  );

  // localStorage'dan geri yükle
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ActivePomodoro;
      if (saved.endsAt <= Date.now()) {
        complete(saved);
      } else {
        setActive(saved);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geri sayım
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const left = Math.round((active.endsAt - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        complete(active);
      } else {
        setRemaining(left);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active, complete]);

  const start = useCallback(async (opts: StartOpts) => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch {
      // yoksay
    }

    const res = await fetch("/api/pomodoro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: opts.taskId ?? null,
        duration_minutes: opts.minutes,
      }),
    });
    const session = await res.json();

    const next: ActivePomodoro = {
      sessionId: session.id,
      taskId: opts.taskId ?? null,
      taskTitle: opts.taskTitle,
      durationMinutes: opts.minutes,
      endsAt: Date.now() + opts.minutes * 60 * 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActive(next);
  }, []);

  const stop = useCallback(async () => {
    if (!active) return;
    try {
      await fetch(`/api/pomodoro?id=${active.sessionId}`, { method: "DELETE" });
    } catch {
      // yoksay
    }
    clearActive();
  }, [active, clearActive]);

  return (
    <PomodoroContext.Provider value={{ active, remaining, start, stop }}>
      {children}
    </PomodoroContext.Provider>
  );
}
