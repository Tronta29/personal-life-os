"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Plus, Loader2, Trash2, Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type Habit = {
  id: string;
  title: string;
  description: string | null;
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
};

export function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/habits");
    const data = await res.json();
    setHabits(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(h: Habit) {
    const res = await fetch("/api/habits/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: h.id }),
    });
    const updated = await res.json();
    setHabits((prev) =>
      prev.map((x) =>
        x.id === h.id
          ? {
              ...x,
              completed_today: updated.completed_today,
              current_streak: updated.current_streak,
              longest_streak: updated.longest_streak,
            }
          : x
      )
    );
  }

  async function remove(id: string) {
    if (!confirm("Alışkanlığı silmek istediğine emin misin?")) return;
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", description: "" });
    setSaving(false);
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Alışkanlıklar</h1>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : habits.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Henüz alışkanlık yok.
        </Card>
      ) : (
        <div className="space-y-2">
          {habits.map((h) => (
            <Card key={h.id} className="flex items-center gap-3 p-3">
              <button
                onClick={() => toggle(h)}
                className={cn(
                  "flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 transition-colors",
                  h.completed_today
                    ? "border-orange-500 bg-orange-500/10 text-orange-500"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
                aria-label="Bugün tamamla"
              >
                {h.completed_today ? (
                  <Check className="size-5" strokeWidth={3} />
                ) : (
                  <Flame className="size-5" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{h.title}</p>
                <p className="text-xs text-muted-foreground">
                  🔥 {h.current_streak} gün · en uzun {h.longest_streak}
                </p>
              </div>
              <button
                onClick={() => remove(h.id)}
                className="shrink-0 rounded-md p-2 text-muted-foreground hover:text-destructive"
                aria-label="Sil"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Yeni Alışkanlık">
        <form onSubmit={add} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="h-title">Başlık</Label>
            <Input
              id="h-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Örn. Her gün 10 dk meditasyon"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h-desc">Açıklama (opsiyonel)</Label>
            <Textarea
              id="h-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Kaydet
          </Button>
        </form>
      </Modal>
    </div>
  );
}
