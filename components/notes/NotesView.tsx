"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Trash2, Pencil, Send, Sparkles } from "lucide-react";
import { formatTrDate } from "@/lib/utils";

type OrganizeSuggestion = {
  id: string;
  content: string;
  suggested_project_id: string | null;
  suggested_project_name: string | null;
  reason: string;
};

type Note = {
  id: string;
  title: string | null;
  content: string;
  is_organized: boolean;
  created_at: string;
  project: { id: string; name: string; color: string } | null;
};

export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [editText, setEditText] = useState("");

  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [suggestions, setSuggestions] = useState<OrganizeSuggestion[]>([]);
  const [organizeError, setOrganizeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notes");
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Hızlı not (FAB) ile eklenince yenile
  useEffect(() => {
    const onCreated = () => load();
    window.addEventListener("notes:created", onCreated);
    return () => window.removeEventListener("notes:created", onCreated);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.content.toLowerCase().includes(q) ||
        (n.title ?? "").toLowerCase().includes(q)
    );
  }, [notes, query]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    setDraft("");
    setSaving(false);
    load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editText.trim()) return;
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, content: editText }),
    });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Notu silmek istediğine emin misin?")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
  }

  async function openOrganize() {
    setOrganizeOpen(true);
    setOrganizing(true);
    setOrganizeError(null);
    setSuggestions([]);
    try {
      const res = await fetch("/api/ai/organize-notes");
      const data = await res.json();
      if (!res.ok) setOrganizeError(data.error ?? "Hata");
      else setSuggestions(data.suggestions ?? []);
    } catch (e) {
      setOrganizeError((e as Error).message);
    }
    setOrganizing(false);
  }

  async function applyOrganize() {
    setOrganizing(true);
    await fetch("/api/ai/organize-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: suggestions.map((s) => ({
          note_id: s.id,
          project_id: s.suggested_project_id,
        })),
      }),
    });
    setOrganizing(false);
    setOrganizeOpen(false);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Notlar</h1>
        <Button variant="outline" size="sm" onClick={openOrganize}>
          <Sparkles className="size-4" /> AI ile düzenle
        </Button>
      </div>

      {/* Her zaman görünür giriş alanı */}
      <Card className="p-3">
        <form onSubmit={add} className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Hızlıca bir not yaz..."
            rows={2}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving || !draft.trim()}>
              {saving ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
              Kaydet
            </Button>
          </div>
        </form>
      </Card>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Notlarda ara..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          {query ? "Eşleşen not yok." : "Henüz not yok."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id} className="p-3">
              {n.title && <p className="mb-1 font-semibold">{n.title}</p>}
              <p className="whitespace-pre-wrap text-sm">{n.content}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTrDate(n.created_at)}</span>
                  {n.project && (
                    <Badge variant="outline">
                      <span
                        className="mr-1 inline-block size-2 rounded-full align-middle"
                        style={{ backgroundColor: n.project.color }}
                      />
                      {n.project.name}
                    </Badge>
                  )}
                  {n.is_organized && <Badge variant="secondary">AI düzenledi</Badge>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(n);
                      setEditText(n.content);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label="Düzenle"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(n.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label="Sil"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Notu Düzenle">
        <form onSubmit={saveEdit} className="space-y-4">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={6}
            autoFocus
          />
          <Button type="submit" className="w-full">
            Kaydet
          </Button>
        </form>
      </Modal>

      {/* AI ile düzenle */}
      <Modal
        open={organizeOpen}
        onClose={() => setOrganizeOpen(false)}
        title="AI Klasörleme Önerisi"
        description="Gemini, kategorisiz notlarını uygun projelere önerir."
      >
        {organizing && suggestions.length === 0 ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="animate-spin" />
          </div>
        ) : organizeError ? (
          <p className="text-sm text-destructive">{organizeError}</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Düzenlenecek kategorisiz not yok.
          </p>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li key={s.id} className="rounded-lg border p-2.5 text-sm">
                  <p className="line-clamp-2">{s.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    →{" "}
                    <span className="font-medium text-foreground">
                      {s.suggested_project_name ?? "Proje önerilmedi"}
                    </span>
                    {s.reason && ` · ${s.reason}`}
                  </p>
                </li>
              ))}
            </ul>
            <Button className="w-full" onClick={applyOrganize} disabled={organizing}>
              {organizing && <Loader2 className="animate-spin" />}
              Önerileri Uygula
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
