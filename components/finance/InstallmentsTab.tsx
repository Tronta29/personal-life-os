"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Plus, Loader2, Trash2, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Installment = {
  id: string;
  title: string;
  total_amount: number;
  installment_count: number;
  monthly_amount: number;
  paid_count: number;
  start_date: string;
};

export function InstallmentsTab() {
  const [items, setItems] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    total_amount: "",
    installment_count: "",
    start_date: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/installments");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthlyPreview =
    form.total_amount && form.installment_count
      ? Number(form.total_amount) / Number(form.installment_count)
      : 0;

  async function pay(i: Installment) {
    setItems((prev) =>
      prev.map((x) =>
        x.id === i.id
          ? { ...x, paid_count: Math.min(x.paid_count + 1, x.installment_count) }
          : x
      )
    );
    await fetch("/api/installments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: i.id, pay: true }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Taksiti silmek istediğine emin misin?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/installments?id=${id}`, { method: "DELETE" });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.total_amount || !form.installment_count) return;
    setSaving(true);
    await fetch("/api/installments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        total_amount: Number(form.total_amount),
        installment_count: Number(form.installment_count),
        start_date: form.start_date || null,
      }),
    });
    setForm({ title: "", total_amount: "", installment_count: "", start_date: "" });
    setSaving(false);
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Taksit yok.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((i) => {
            const remaining = i.installment_count - i.paid_count;
            const pct = (i.paid_count / i.installment_count) * 100;
            const done = remaining <= 0;
            return (
              <Card key={i.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-semibold">{i.title}</span>
                  <button
                    onClick={() => remove(i.id)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Sil"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aylık {formatCurrency(i.monthly_amount)} · toplam{" "}
                  {formatCurrency(i.total_amount)}
                </p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {i.paid_count}/{i.installment_count} ödendi
                    </span>
                    <span>{remaining} taksit kaldı</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => pay(i)}
                  disabled={done}
                >
                  <Check className="size-4" /> {done ? "Bitti" : "Taksit Öde"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Yeni Taksit">
        <form onSubmit={add} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="i-title">Ürün adı</Label>
            <Input
              id="i-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Örn. Telefon"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="i-total">Toplam tutar</Label>
              <Input
                id="i-total"
                type="number"
                step="0.01"
                min="0"
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-count">Taksit sayısı</Label>
              <Input
                id="i-count"
                type="number"
                min="1"
                value={form.installment_count}
                onChange={(e) => setForm({ ...form, installment_count: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="i-date">Başlangıç tarihi</Label>
            <Input
              id="i-date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          {monthlyPreview > 0 && (
            <p className="text-sm text-muted-foreground">
              Aylık taksit:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(monthlyPreview)}
              </span>
            </p>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Kaydet
          </Button>
        </form>
      </Modal>
    </div>
  );
}
