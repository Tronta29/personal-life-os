"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ColorPicker } from "@/components/shared/ColorPicker";
import { Pencil, Trash2, Plus, Receipt, Loader2 } from "lucide-react";
import {
  PROJECT_STATUSES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  type ProjectStatus,
  type TaskCategory,
  type TaskPriority,
} from "@/types";
import { toDateKey } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
};
type Category = { id: string; name: string };

export function ProjectDetailActions({ project }: { project: Project }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [edit, setEdit] = useState({
    name: project.name,
    description: project.description ?? "",
    color: project.color,
    status: project.status,
  });
  const [task, setTask] = useState({
    title: "",
    category: "Kişisel" as TaskCategory,
    priority: "MEDIUM" as TaskPriority,
  });
  const [expense, setExpense] = useState({
    amount: "",
    category_id: "",
    description: "",
    transaction_date: toDateKey(),
  });

  useEffect(() => {
    fetch("/api/finance/categories")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCategories(d))
      .catch(() => {});
  }, []);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: project.id, ...edit }),
    });
    setSaving(false);
    setEditOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Projeyi silmek istediğine emin misin? Bağlı görev ve giderlerin proje bağlantısı kaldırılır.")) return;
    await fetch(`/api/projects?id=${project.id}`, { method: "DELETE" });
    router.push("/projects");
    router.refresh();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!task.title.trim()) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...task, project_id: project.id }),
    });
    setTask({ title: "", category: "Kişisel", priority: "MEDIUM" });
    setSaving(false);
    setTaskOpen(false);
    router.refresh();
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expense.amount) return;
    setSaving(true);
    await fetch("/api/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "EXPENSE",
        amount: Number(expense.amount),
        category_id: expense.category_id || null,
        description: expense.description,
        transaction_date: expense.transaction_date,
        project_id: project.id,
      }),
    });
    setExpense({ amount: "", category_id: "", description: "", transaction_date: toDateKey() });
    setSaving(false);
    setExpenseOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>
        <Plus className="size-4" /> Görev Ekle
      </Button>
      <Button size="sm" variant="outline" onClick={() => setExpenseOpen(true)}>
        <Receipt className="size-4" /> Gider Ekle
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
        <Pencil className="size-4" /> Düzenle
      </Button>
      <Button size="sm" variant="ghost" onClick={remove} className="text-destructive">
        <Trash2 className="size-4" /> Sil
      </Button>

      {/* Düzenle */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Projeyi Düzenle">
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-name">İsim</Label>
            <Input
              id="e-name"
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-desc">Açıklama</Label>
            <Textarea
              id="e-desc"
              value={edit.description}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Renk</Label>
            <ColorPicker value={edit.color} onChange={(color) => setEdit({ ...edit, color })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-status">Durum</Label>
            <Select
              id="e-status"
              value={edit.status}
              onChange={(e) => setEdit({ ...edit, status: e.target.value as ProjectStatus })}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Kaydet
          </Button>
        </form>
      </Modal>

      {/* Görev ekle */}
      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="Projeye Görev Ekle">
        <form onSubmit={addTask} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pt-title">Başlık</Label>
            <Input
              id="pt-title"
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pt-cat">Kategori</Label>
              <Select
                id="pt-cat"
                value={task.category}
                onChange={(e) => setTask({ ...task, category: e.target.value as TaskCategory })}
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-pri">Öncelik</Label>
              <Select
                id="pt-pri"
                value={task.priority}
                onChange={(e) => setTask({ ...task, priority: e.target.value as TaskPriority })}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Ekle
          </Button>
        </form>
      </Modal>

      {/* Gider ekle */}
      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Projeye Gider Ekle">
        <form onSubmit={addExpense} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pe-amount">Tutar (TRY)</Label>
            <Input
              id="pe-amount"
              type="number"
              step="0.01"
              min="0"
              value={expense.amount}
              onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe-cat">Kategori</Label>
            <Select
              id="pe-cat"
              value={expense.category_id}
              onChange={(e) => setExpense({ ...expense, category_id: e.target.value })}
            >
              <option value="">Kategorisiz</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe-desc">Açıklama</Label>
            <Input
              id="pe-desc"
              value={expense.description}
              onChange={(e) => setExpense({ ...expense, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pe-date">Tarih</Label>
            <Input
              id="pe-date"
              type="date"
              value={expense.transaction_date}
              onChange={(e) => setExpense({ ...expense, transaction_date: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Ekle
          </Button>
        </form>
      </Modal>
    </div>
  );
}
