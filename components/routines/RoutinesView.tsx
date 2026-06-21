"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Check, Plus, Trash2, Loader2, Layers } from "lucide-react";
import { cn, formatTrDate } from "@/lib/utils";

type Routine = {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
};

type Profile = {
  id: string;
  name: string;
  is_active: boolean;
  routine_count: number;
};

export function RoutinesView() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, pRes] = await Promise.all([
      fetch("/api/routines"),
      fetch("/api/routine-profiles"),
    ]);
    const [data, pData] = await Promise.all([rRes.json(), pRes.json()]);
    setRoutines(data.routines ?? []);
    setProfileName(data.profile?.name ?? null);
    setProfiles(Array.isArray(pData) ? pData : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function switchProfile(id: string) {
    setSwitching(true);
    await fetch("/api/routine-profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, activate: true }),
    });
    await load();
    setSwitching(false);
  }

  async function addProfile() {
    const name = prompt("Yeni profil adı:");
    if (!name?.trim()) return;
    await fetch("/api/routine-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    load();
  }

  async function toggle(r: Routine) {
    const next = !r.is_completed;
    setRoutines((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, is_completed: next } : x))
    );
    await fetch("/api/routines/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routine_id: r.id, is_completed: next }),
    });
  }

  async function addRoutine(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setTitle("");
    setDescription("");
    setSaving(false);
    setAddOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Bu rutini kaldırmak istediğine emin misin?")) return;
    setRoutines((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/routines?id=${id}`, { method: "DELETE" });
  }

  const done = routines.filter((r) => r.is_completed).length;
  const total = routines.length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rutinler</h1>
          <p className="text-sm text-muted-foreground">
            {formatTrDate(new Date())}
            {profileName && (
              <>
                {" · "}
                <span className="font-medium text-foreground">{profileName}</span>
              </>
            )}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {/* Profil değiştirici */}
      {profiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="size-4 text-muted-foreground" />
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => !p.is_active && switchProfile(p.id)}
              disabled={switching}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-60",
                p.is_active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              {p.name}
              <span className="ml-1 text-xs opacity-70">({p.routine_count})</span>
            </button>
          ))}
          <button
            onClick={addProfile}
            className="rounded-full border px-2.5 py-1 text-sm hover:bg-accent"
            aria-label="Yeni profil"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      )}

      {!loading && total > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Bugünkü ilerleme</span>
            <span className="text-muted-foreground">
              {done}/{total} tamamlandı
            </span>
          </div>
          <ProgressBar value={total ? (done / total) * 100 : 0} />
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : total === 0 ? (
        <EmptyState onAdd={() => setAddOpen(true)} />
      ) : (
        <div className="space-y-2">
          {routines.map((r) => (
            <Card
              key={r.id}
              className={cn(
                "flex items-center gap-3 p-3 transition-colors",
                r.is_completed && "bg-success/10"
              )}
            >
              <button
                onClick={() => toggle(r)}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  r.is_completed
                    ? "border-success bg-success text-white"
                    : "border-muted-foreground/40"
                )}
                aria-label="Tamamla"
              >
                {r.is_completed && <Check className="size-4" strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1" onClick={() => toggle(r)}>
                <p
                  className={cn(
                    "font-medium",
                    r.is_completed && "text-muted-foreground line-through"
                  )}
                >
                  {r.title}
                </p>
                {r.description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {r.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(r.id)}
                className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
                aria-label="Sil"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Yeni Rutin"
        description={profileName ? `${profileName} profiline eklenir` : undefined}
      >
        <form onSubmit={addRoutine} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r-title">Başlık</Label>
            <Input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. 10 dk meditasyon"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-desc">Açıklama (opsiyonel)</Label>
            <Textarea
              id="r-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <p className="text-muted-foreground">
        Aktif profilde henüz rutin yok. Şema seed&apos;ini çalıştırdın mı?
      </p>
      <Button onClick={onAdd} variant="outline">
        <Plus className="size-4" /> İlk rutini ekle
      </Button>
    </Card>
  );
}
