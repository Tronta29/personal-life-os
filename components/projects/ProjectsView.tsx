"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ColorPicker } from "@/components/shared/ColorPicker";
import { Plus, Loader2, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PROJECT_STATUSES, type ProjectStatus } from "@/types";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  task_total: number;
  task_completed: number;
  total_spend: number;
};

const STATUS_VARIANT: Record<ProjectStatus, "success" | "warning" | "secondary"> = {
  ACTIVE: "success",
  ON_HOLD: "warning",
  COMPLETED: "secondary",
};
const STATUS_LABEL = Object.fromEntries(PROJECT_STATUSES.map((s) => [s.value, s.label]));

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#3182ce",
    status: "ACTIVE" as ProjectStatus,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", description: "", color: "#3182ce", status: "ACTIVE" });
    setSaving(false);
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Projeler</h1>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Henüz proje yok.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => {
            const pct = p.task_total ? (p.task_completed / p.task_total) * 100 : 0;
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full p-4 transition-colors hover:bg-accent/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate font-semibold">{p.name}</span>
                    </div>
                    <Badge variant={STATUS_VARIANT[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {p.task_completed}/{p.task_total} görev
                      </span>
                      <span>%{pct.toFixed(0)}</span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Toplam harcama</span>
                    <span className="font-medium">{formatCurrency(p.total_spend)}</span>
                  </div>
                  <div className="mt-2 flex justify-end text-xs text-primary">
                    Detay <ChevronRight className="size-3.5" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Yeni Proje">
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-name">İsim</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-desc">Açıklama</Label>
            <Textarea
              id="p-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Renk</Label>
            <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-status">Durum</Label>
            <Select
              id="p-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
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
