"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBar } from "@/components/finance/CategoryBar";
import { SubscriptionsTab } from "@/components/finance/SubscriptionsTab";
import { InstallmentsTab } from "@/components/finance/InstallmentsTab";
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { formatCurrency, toDateKey } from "@/lib/utils";
import { PAYMENT_METHODS, type PaymentMethod } from "@/types";

type Category = { id: string; name: string; color: string; monthly_budget_limit: number };
type Project = { id: string; name: string };
type Tx = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string | null;
  client_name: string | null;
  is_paid: boolean;
  payment_method: PaymentMethod;
  transaction_date: string;
  category: { id: string; name: string; color: string } | null;
  project: { id: string; name: string; color: string } | null;
};

type Tab = "genel" | "abonelik" | "taksit";
const PAYMENT_LABEL = Object.fromEntries(PAYMENT_METHODS.map((p) => [p.value, p.label]));

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1)
  );
}

const EMPTY_FORM = {
  type: "EXPENSE" as "INCOME" | "EXPENSE",
  amount: "",
  category_id: "",
  project_id: "",
  description: "",
  client_name: "",
  is_paid: true,
  payment_method: "CASH" as PaymentMethod,
  transaction_date: toDateKey(),
};

export function FinanceView() {
  const [month, setMonth] = useState(currentMonth());
  const [txs, setTxs] = useState<Tx[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState<Tab>("genel");
  const [payFilter, setPayFilter] = useState<PaymentMethod | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    const [txRes, catRes, projRes] = await Promise.all([
      fetch(`/api/finance/transactions?month=${month}`),
      fetch("/api/finance/categories"),
      fetch("/api/projects"),
    ]);
    const [txData, catData, projData] = await Promise.all([
      txRes.json(),
      catRes.json(),
      projRes.json(),
    ]);
    setTxs(Array.isArray(txData) ? txData : []);
    setCategories(Array.isArray(catData) ? catData : []);
    setProjects(Array.isArray(projData) ? projData : []);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const { income, expense, net } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of txs) {
      if (t.type === "INCOME") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [txs]);

  const categorySlices = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number }>();
    for (const t of txs) {
      if (t.type !== "EXPENSE") continue;
      const key = t.category?.id ?? "none";
      const name = t.category?.name ?? "Kategorisiz";
      const color = t.category?.color ?? "#718096";
      const cur = map.get(key) ?? { name, color, amount: 0 };
      cur.amount += t.amount;
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [txs]);

  const budgetWarnings = useMemo(() => {
    const spentByCat = new Map<string, number>();
    for (const t of txs) {
      if (t.type === "EXPENSE" && t.category)
        spentByCat.set(t.category.id, (spentByCat.get(t.category.id) ?? 0) + t.amount);
    }
    return categories
      .filter((c) => c.monthly_budget_limit > 0)
      .map((c) => ({
        ...c,
        spent: spentByCat.get(c.id) ?? 0,
      }))
      .filter((c) => c.spent > c.monthly_budget_limit);
  }, [txs, categories]);

  const alvoIncome = useMemo(
    () => txs.filter((t) => t.type === "INCOME" && t.client_name),
    [txs]
  );

  const visibleTxs = useMemo(
    () => (payFilter ? txs.filter((t) => t.payment_method === payFilter) : txs),
    [txs, payFilter]
  );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    await fetch("/api/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        category_id: form.category_id || null,
        project_id: form.project_id || null,
        client_name: form.type === "INCOME" ? form.client_name : null,
      }),
    });
    setForm({ ...EMPTY_FORM, transaction_date: toDateKey() });
    setSaving(false);
    setOpen(false);
    load();
  }

  async function togglePaid(t: Tx) {
    setTxs((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, is_paid: !x.is_paid } : x))
    );
    await fetch("/api/finance/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, is_paid: !t.is_paid }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Bu kaydı silmek istediğine emin misin?")) return;
    setTxs((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/finance/transactions?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Finans</h1>
        {tab === "genel" && (
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="size-4" /> Ekle
          </Button>
        )}
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b">
        {([
          ["genel", "Genel"],
          ["abonelik", "Abonelikler"],
          ["taksit", "Taksitler"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              tab === key
                ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground"
                : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "abonelik" && <SubscriptionsTab />}
      {tab === "taksit" && <InstallmentsTab />}

      {tab === "genel" && (
      <>
      {/* Ay seçici */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-40 text-center font-medium capitalize">
          {monthLabel(month)}
        </span>
        <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <>
          {/* Özet kartları */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <SummaryCard
              icon={<TrendingUp className="size-4 text-success" />}
              label="Gelir"
              value={income}
              valueClass="text-success"
            />
            <SummaryCard
              icon={<TrendingDown className="size-4 text-destructive" />}
              label="Gider"
              value={expense}
              valueClass="text-destructive"
            />
            <SummaryCard
              icon={<Wallet className="size-4" />}
              label="Net"
              value={net}
              valueClass={net >= 0 ? "text-success" : "text-destructive"}
            />
          </div>

          {/* Bütçe uyarıları */}
          {budgetWarnings.length > 0 && (
            <Card className="border-warning/50 bg-warning/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-5 text-warning" /> Bütçe Uyarısı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {budgetWarnings.map((c) => (
                  <p key={c.id}>
                    <span className="font-medium">{c.name}</span>:{" "}
                    {formatCurrency(c.spent)} / {formatCurrency(c.monthly_budget_limit)}{" "}
                    limit aşıldı
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Kategori dağılımı */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gider Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBar data={categorySlices} />
            </CardContent>
          </Card>

          {/* Alvo / Hakediş takibi */}
          {alvoIncome.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Hakediş Takibi (Müşteri)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {alvoIncome.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.client_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.description || t.project?.name || "—"} ·{" "}
                          {formatCurrency(t.amount)}
                        </p>
                      </div>
                      <button onClick={() => togglePaid(t)}>
                        <Badge variant={t.is_paid ? "success" : "warning"}>
                          {t.is_paid ? "Ödendi" : "Bekliyor"}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* İşlem listesi */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">İşlemler</CardTitle>
              <Select
                value={payFilter}
                onChange={(e) => setPayFilter(e.target.value as PaymentMethod | "")}
                className="h-9 w-auto"
              >
                <option value="">Tüm yöntemler</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </CardHeader>
            <CardContent>
              {visibleTxs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bu ay için işlem yok.</p>
              ) : (
                <ul className="divide-y">
                  {visibleTxs.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 py-2.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: t.category?.color ?? "#718096" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          {t.description || t.category?.name || "İşlem"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {PAYMENT_LABEL[t.payment_method] ?? "Nakit"}
                          {t.category && ` · ${t.category.name}`}
                          {t.project && ` · ${t.project.name}`} ·{" "}
                          {new Date(t.transaction_date).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <span
                        className={
                          t.type === "INCOME"
                            ? "shrink-0 font-medium text-success"
                            : "shrink-0 font-medium text-destructive"
                        }
                      >
                        {t.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </span>
                      <button
                        onClick={() => remove(t.id)}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                        aria-label="Sil"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
      </>
      )}

      {/* Ekleme modalı */}
      <Modal open={open} onClose={() => setOpen(false)} title="Yeni İşlem">
        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={form.type === "EXPENSE" ? "default" : "outline"}
              onClick={() => setForm({ ...form, type: "EXPENSE" })}
            >
              Gider
            </Button>
            <Button
              type="button"
              variant={form.type === "INCOME" ? "default" : "outline"}
              onClick={() => setForm({ ...form, type: "INCOME" })}
            >
              Gelir
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-amount">Tutar (TRY)</Label>
            <Input
              id="f-amount"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="f-cat">Kategori</Label>
              <Select
                id="f-cat"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
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
              <Label htmlFor="f-proj">Proje</Label>
              <Select
                id="f-proj"
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-pay">Ödeme yöntemi</Label>
            <Select
              id="f-pay"
              value={form.payment_method}
              onChange={(e) =>
                setForm({ ...form, payment_method: e.target.value as PaymentMethod })
              }
            >
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-desc">Açıklama</Label>
            <Input
              id="f-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {form.type === "INCOME" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="f-client">Müşteri adı (Alvo hakediş)</Label>
                <Input
                  id="f-client"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  placeholder="opsiyonel"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_paid}
                  onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
                  className="size-4"
                />
                Ödendi
              </label>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="f-date">Tarih</Label>
            <Input
              id="f-date"
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
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

function SummaryCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon} {label}
        </div>
        <p className={`text-sm font-bold sm:text-lg ${valueClass ?? ""}`}>
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  );
}
