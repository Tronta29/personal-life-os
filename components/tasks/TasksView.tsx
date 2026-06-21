"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Play, Check, Clock, XCircle, Trash2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePomodoro } from "@/components/pomodoro/PomodoroProvider";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  PRIORITY_ORDER,
  type TaskStatus,
  type TaskPriority,
  type TaskCategory,
} from "@/types";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  cancelled_reason: string | null;
  postponed_count: number;
  start_time: string | null;
  project: { id: string; name: string; color: string } | null;
};

type Project = { id: string; name: string };

type Filter = "active" | "done" | "all";

const PRIORITY_VARIANT: Record<TaskPriority, "secondary" | "warning" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "secondary",
  HIGH: "warning",
  CRITICAL: "destructive",
};

const STATUS_LABEL = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, s.label]));

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Kişisel" as TaskCategory,
    priority: "MEDIUM" as TaskPriority,
    project_id: "",
  });

  const { start: startPomodoro } = usePomodoro();

  const load = useCallback(async () => {
    setLoading(true);
    const [taskRes, projRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/projects"),
    ]);
    const [data, projData] = await Promise.all([taskRes.json(), projRes.json()]);
    setTasks(Array.isArray(data) ? data : []);
    setProjects(Array.isArray(projData) ? projData : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Pomodoro bitince görev otomatik tamamlandığı için listeyi yenile
  useEffect(() => {
    const onDone = () => load();
    window.addEventListener("pomodoro:completed", onDone);
    return () => window.removeEventListener("pomodoro:completed", onDone);
  }, [load]);

  async function pomodoro(t: Task) {
    const input = prompt("Pomodoro süresi (dakika):", "25");
    if (input === null) return;
    const minutes = parseInt(input, 10);
    if (!minutes || minutes <= 0) return;
    await startPomodoro({ taskId: t.id, taskTitle: t.title, minutes });
    setTasks((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, status: "IN_PROGRESS" } : x))
    );
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...(body as Partial<Task>) } : t))
    );
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    load();
  }

  async function cancel(id: string) {
    const reason = prompt("İptal sebebi (AI yeniden planlama için saklanır):");
    if (reason === null) return;
    patch(id, { status: "CANCELLED", cancelled_reason: reason });
  }

  async function postpone(id: string) {
    patch(id, { status: "POSTPONED", incrementPostpone: true });
  }

  async function remove(id: string) {
    if (!confirm("Görevi silmek istediğine emin misin?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, project_id: form.project_id || null }),
    });
    setForm({
      title: "",
      description: "",
      category: "Kişisel",
      priority: "MEDIUM",
      project_id: "",
    });
    setSaving(false);
    setAddOpen(false);
    load();
  }

  const filtered = tasks
    .filter((t) => {
      if (filter === "active") return t.status === "TODO" || t.status === "IN_PROGRESS";
      if (filter === "done") return t.status === "COMPLETED";
      return true;
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Görevler</h1>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      <div className="flex gap-2">
        {([
          ["active", "Aktif"],
          ["done", "Tamamlanan"],
          ["all", "Tümü"],
        ] as [Filter, string][]).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Bu görünümde görev yok.
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      (t.status === "COMPLETED" || t.status === "CANCELLED") &&
                        "text-muted-foreground line-through"
                    )}
                  >
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant={PRIORITY_VARIANT[t.priority]}>
                      {TASK_PRIORITIES.find((p) => p.value === t.priority)?.label}
                    </Badge>
                    <Badge variant="outline">{t.category}</Badge>
                    {t.project && (
                      <Badge variant="outline">
                        <span
                          className="mr-1 inline-block size-2 rounded-full align-middle"
                          style={{ backgroundColor: t.project.color }}
                        />
                        {t.project.name}
                      </Badge>
                    )}
                    {t.status !== "TODO" && (
                      <Badge variant="secondary">{STATUS_LABEL[t.status]}</Badge>
                    )}
                    {t.postponed_count > 0 && (
                      <Badge variant="outline">↻ {t.postponed_count}x ertelendi</Badge>
                    )}
                  </div>
                  {t.cancelled_reason && (
                    <p className="mt-1 text-xs text-destructive">
                      İptal: {t.cancelled_reason}
                    </p>
                  )}
                </div>
              </div>

              {t.status !== "COMPLETED" && t.status !== "CANCELLED" && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                  {t.status === "TODO" && (
                    <Button size="sm" variant="outline" onClick={() => patch(t.id, { status: "IN_PROGRESS" })}>
                      <Play className="size-4" /> Başla
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => patch(t.id, { status: "COMPLETED" })}>
                    <Check className="size-4" /> Bitir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => pomodoro(t)}>
                    <Timer className="size-4" /> Pomodoro
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => postpone(t.id)}>
                    <Clock className="size-4" /> Ertele
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => cancel(t.id)}>
                    <XCircle className="size-4" /> İptal
                  </Button>
                </div>
              )}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => remove(t.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label="Sil"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Yeni Görev">
        <form onSubmit={addTask} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-title">Başlık</Label>
            <Input
              id="t-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-desc">Açıklama</Label>
            <Textarea
              id="t-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="t-cat">Kategori</Label>
              <Select
                id="t-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })}
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-pri">Öncelik</Label>
              <Select
                id="t-pri"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-proj">Proje (opsiyonel)</Label>
            <Select
              id="t-proj"
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            >
              <option value="">Yok</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Kaydet
          </Button>
        </form>
      </Modal>
    </div>
  );
}
