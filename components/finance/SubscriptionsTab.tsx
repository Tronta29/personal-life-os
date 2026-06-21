"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { SUBSCRIPTION_PERIODS, type SubscriptionPeriod } from "@/types";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: SubscriptionPeriod;
  next_billing_date: string;
  is_active: boolean;
};

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function SubscriptionsTab() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    currency: "TRY",
    period: "MONTHLY" as SubscriptionPeriod,
    next_billing_date: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/subscriptions");
    const data = await res.json();
    setSubs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthlyTotal = useMemo(
    () =>
      subs
        .filter((s) => s.is_active)
        .reduce((sum, s) => sum + (s.period === "YEARLY" ? s.amount / 12 : s.amount), 0),
    [subs]
  );

  async function toggleActive(s: Subscription) {
    setSubs((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x))
    );
    await fetch("/api/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Aboneliği silmek istediğine emin misin?")) return;
    setSubs((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/subscriptions?id=${id}`, { method: "DELETE" });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.next_billing_date) return;
    setSaving(true);
    await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setForm({ name: "", amount: "", currency: "TRY", period: "MONTHLY", next_billing_date: "" });
    setSaving(false);
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Card className="flex-1">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Aylık toplam abonelik</p>
            <p className="text-lg font-bold">{formatCurrency(monthlyTotal)}</p>
          </CardContent>
        </Card>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="size-4" /> Ekle
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : subs.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Abonelik yok.</Card>
      ) : (
        <div className="space-y-2">
          {subs.map((s) => {
            const left = daysUntil(s.next_billing_date);
            const soon = s.is_active && left >= 0 && left <= 3;
            return (
              <Card
                key={s.id}
                className={cn("flex items-center gap-3 p-3", !s.is_active && "opacity-60")}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(s.amount, s.currency)} /{" "}
                    {s.period === "YEARLY" ? "yıl" : "ay"} · yenileme{" "}
                    {new Date(s.next_billing_date).toLocaleDateString("tr-TR")}
                  </p>
                  {soon && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
                      <AlertTriangle className="size-3.5" />
                      {left === 0 ? "Bugün yenileniyor!" : `${left} gün içinde yenilenecek`}
                    </p>
                  )}
                </div>
                <button onClick={() => toggleActive(s)}>
                  <Badge variant={s.is_active ? "success" : "secondary"}>
                    {s.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label="Sil"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Yeni Abonelik">
        <form onSubmit={add} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s-name">İsim</Label>
            <Input
              id="s-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Örn. Netflix, Spotify"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="s-amount">Tutar</Label>
              <Input
                id="s-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-cur">Para birimi</Label>
              <Select
                id="s-cur"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="s-period">Periyot</Label>
              <Select
                id="s-period"
                value={form.period}
                onChange={(e) =>
                  setForm({ ...form, period: e.target.value as SubscriptionPeriod })
                }
              >
                {SUBSCRIPTION_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-date">Sonraki ödeme</Label>
              <Input
                id="s-date"
                type="date"
                value={form.next_billing_date}
                onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Kaydet
          </Button>
        </form>
      </Modal>
    </div>
  );
}
