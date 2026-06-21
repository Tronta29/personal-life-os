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
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Plus, Loader2, Trash2, Check, Target, Pencil, XCircle } from "lucide-react";
import { cn, formatTrDate } from "@/lib/utils";
import {
  GOAL_TYPES,
  type GoalType,
  type GoalStatus,
} from "@/types";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  target_value: number | null;
  current_value: number;
  target_date: string | null;
  project: { id: string; name: string; color: string } | null;
};
type Project = { id: string; name: string };

const STATUS_VARIANT: Record<GoalStatus, "success" | "secondary" | "destructive"> = {
  ACTIVE: "success",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};
const STATUS_LABEL: Record<GoalStatus, string> = {
  ACTIVE: "Aktif",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

function daysLeft(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "NUMERIC" as GoalType,
    target_value: "",
    target_date: "",
    project_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [gRes, pRes] = await Promise.all([
      fetch("/api/goals"),
      fetch("/api/projects"),
    ]);
    const [g, p] = await Promise.all([gRes.json(), pRes.json()]);
    setGoals(Array.isArray(g) ? g : []);
    setProjects(Array.isArray(p) ? p : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    load();
  }

  async function updateProgress(g: Goal) {
    const input = prompt(`Güncel değer (${g.title}):`, String(g.current_value));
    if (input === null) return;
    const val = Number(input);
    if (Number.isNaN(val)) return;
    patch(g.id, { current_value: val });
  }

  async function remove(id: string) {
    if (!confirm("Hedefi silmek istediğine emin misin?")) return;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        type: form.type,
        target_value: form.type === "NUMERIC" ? Number(form.target_value) || null : null,
        target_date: form.type === "DATE" ? form.target_date || null : null,
        project_id: form.project_id || null,
      }),
    });
    setForm({
      title: "",
      description: "",
      type: "NUMERIC",
      target_value: "",
      target_date: "",
      project_id: "",
    });
    setSaving(false);
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Hedefler</h1>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Henüz hedef yok.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const pct =
              g.type === "NUMERIC" && g.target_value
                ? Math.min(100, (g.current_value / g.target_value) * 100)
                : g.status === "COMPLETED"
                ? 100
                : 0;
            const muted = g.status !== "ACTIVE";
            return (
              <Card key={g.id} className={cn("p-4", muted && "opacity-70")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Target className="size-4 shrink-0 text-primary" />
                    <span className="truncate font-semibold">{g.title}</span>
                  </div>
                  <Badge variant={STATUS_VARIANT[g.status]}>{STATUS_LABEL[g.status]}</Badge>
                </div>
                {g.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                )}
                {g.project && (
                  <Badge variant="outline" className="mt-2">
                    <span
                      className="mr-1 inline-block size-2 rounded-full align-middle"
                      style={{ backgroundColor: g.project.color }}
                    />
                    {g.project.name}
                  </Badge>
                )}

                {g.type === "NUMERIC" && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {g.current_value} / {g.target_value ?? "?"}
                      </span>
                      <span>%{pct.toFixed(0)}</span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                )}
                {g.type === "DATE" && g.target_date && (
                  <p className="mt-3 text-sm">
                    🗓️ {formatTrDate(g.target_date)}{" "}
                    <span className="text-muted-foreground">
                      ({daysLeft(g.target_date)} gün kaldı)
                    </span>
                  </p>
                )}

                {g.status === "ACTIVE" && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                    {g.type === "NUMERIC" && (
                      <Button size="sm" variant="outline" onClick={() => updateProgress(g)}>
                        <Pencil className="size-4" /> İlerleme
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patch(g.id, { status: "COMPLETED" })}
                    >
                      <Check className="size-4" /> Tamamla
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patch(g.id, { status: "CANCELLED" })}
                    >
                      <XCircle className="size-4" /> İptal
                    </Button>
                  </div>
                )}
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => remove(g.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label="Sil"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Yeni Hedef">
        <form onSubmit={add} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="g-title">Başlık</Label>
            <Input
              id="g-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-type">Tip</Label>
            <Select
              id="g-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as GoalType })}
            >
              {GOAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          {form.type === "NUMERIC" && (
            <div className="space-y-2">
              <Label htmlFor="g-target">Hedef değer</Label>
              <Input
                id="g-target"
                type="number"
                step="any"
                value={form.target_value}
                onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                placeholder="Örn. 100"
              />
            </div>
          )}
          {form.type === "DATE" && (
            <div className="space-y-2">
              <Label htmlFor="g-date">Hedef tarih</Label>
              <Input
                id="g-date"
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="g-proj">Proje (opsiyonel)</Label>
            <Select
              id="g-proj"
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
          <div className="space-y-2">
            <Label htmlFor="g-desc">Açıklama</Label>
            <Textarea
              id="g-desc"
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
