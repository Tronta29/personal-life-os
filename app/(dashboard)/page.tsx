import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatTrDate, getWeekStart, toDateKey } from "@/lib/utils";
import { PRIORITY_ORDER, TASK_PRIORITIES, type TaskPriority } from "@/types";
import {
  ListChecks,
  CheckSquare,
  ChevronRight,
  Target,
  Flame,
  CreditCard,
  Package,
  AlertTriangle,
} from "lucide-react";
import { AICommand } from "@/components/ai/AICommand";
import { WeeklyScoreWidget } from "@/components/ai/WeeklyScoreWidget";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date(toDateKey());

  // Aktif profil + rutinler + bugünkü tamamlamalar
  const profile = await prisma.routineProfile.findFirst({
    where: { is_active: true },
    select: { id: true, name: true },
  });

  let routinesDone = 0;
  let routinesTotal = 0;
  if (profile) {
    const routineIds = (
      await prisma.routine.findMany({
        where: { profile_id: profile.id, is_active: true },
        select: { id: true },
      })
    ).map((r) => r.id);
    routinesTotal = routineIds.length;
    if (routineIds.length) {
      routinesDone = await prisma.routineCompletion.count({
        where: {
          completed_date: today,
          is_completed: true,
          routine_id: { in: routineIds },
        },
      });
    }
  }

  // Aktif görevler
  const tasksRaw = await prisma.task.findMany({
    where: { status: { in: ["TODO", "IN_PROGRESS"] } },
    select: { id: true, title: true, priority: true, category: true, status: true },
  });

  const tasks = tasksRaw.sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority as TaskPriority] -
      PRIORITY_ORDER[b.priority as TaskPriority]
  );

  // Bu ayın net bakiyesi
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  const monthTx = await prisma.financeTransaction.groupBy({
    by: ["type"],
    where: { transaction_date: { gte: monthStart, lt: monthEnd } },
    _sum: { amount: true },
  });
  let income = 0;
  let expense = 0;
  for (const r of monthTx) {
    const v = Number(r._sum.amount ?? 0);
    if (r.type === "INCOME") income = v;
    else expense = v;
  }
  const netBalance = income - expense;

  // Bu haftanın skoru (varsa)
  const weeklyRaw = await prisma.weeklyScore.findUnique({
    where: { week_start: new Date(getWeekStart()) },
  });
  const weekly = weeklyRaw
    ? {
        score_percent: Number(weeklyRaw.score_percent),
        routines_completed: weeklyRaw.routines_completed,
        routines_total: weeklyRaw.routines_total,
        tasks_completed: weeklyRaw.tasks_completed,
        tasks_total: weeklyRaw.tasks_total,
        ai_summary: weeklyRaw.ai_summary,
      }
    : null;

  // Hedefler (aktif, ilk 3) + en yüksek streak'ler (ilk 3)
  const [activeGoals, topHabits, ccAgg, subs] = await Promise.all([
    prisma.goal.findMany({
      where: { status: "ACTIVE" },
      orderBy: { created_at: "desc" },
      take: 3,
    }),
    prisma.habit.findMany({
      where: { is_active: true },
      orderBy: { current_streak: "desc" },
      take: 3,
    }),
    prisma.financeTransaction.aggregate({
      where: {
        type: "EXPENSE",
        payment_method: "CREDIT_CARD",
        transaction_date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.subscription.findMany({ where: { is_active: true } }),
  ]);

  const creditCardTotal = Number(ccAgg._sum.amount ?? 0);
  const subscriptionMonthly = subs.reduce(
    (sum, s) => sum + (s.period === "YEARLY" ? s.amount / 12 : s.amount),
    0
  );
  const now3 = new Date();
  now3.setHours(0, 0, 0, 0);
  const in3days = new Date(now3);
  in3days.setDate(in3days.getDate() + 3);
  const renewingSoon = subs.filter((s) => {
    const d = new Date(s.next_billing_date);
    return d >= now3 && d <= in3days;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold capitalize">{formatTrDate(new Date())}</h1>
        {profile && (
          <p className="text-sm text-muted-foreground">
            Aktif profil:{" "}
            <span className="font-medium text-foreground">{profile.name}</span>
          </p>
        )}
      </div>

      <AICommand />

      {/* Yenilenecek abonelik uyarısı */}
      {renewingSoon.length > 0 && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="flex items-start gap-2 p-3 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            <div>
              <p className="font-medium">3 gün içinde yenilenecek abonelikler</p>
              {renewingSoon.map((s) => (
                <p key={s.id} className="text-muted-foreground">
                  {s.name} — {new Date(s.next_billing_date).toLocaleDateString("tr-TR")} ·{" "}
                  {formatCurrency(s.amount, s.currency)}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hedefler + Streak'ler */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-5" /> Aktif Hedefler
            </CardTitle>
            <Link href="/goals">
              <Button variant="ghost" size="sm">
                Tümü <ChevronRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aktif hedef yok.</p>
            ) : (
              <ul className="space-y-3">
                {activeGoals.map((g) => {
                  const pct =
                    g.type === "NUMERIC" && g.target_value
                      ? Math.min(100, (g.current_value / g.target_value) * 100)
                      : 0;
                  return (
                    <li key={g.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="min-w-0 truncate">{g.title}</span>
                        {g.type === "NUMERIC" && g.target_value ? (
                          <span className="text-muted-foreground">%{pct.toFixed(0)}</span>
                        ) : null}
                      </div>
                      {g.type === "NUMERIC" && g.target_value ? (
                        <ProgressBar value={pct} />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {g.type === "DATE" && g.target_date
                            ? new Date(g.target_date).toLocaleDateString("tr-TR")
                            : "Devam ediyor"}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="size-5" /> En Yüksek Seriler
            </CardTitle>
            <Link href="/habits">
              <Button variant="ghost" size="sm">
                Tümü <ChevronRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {topHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Alışkanlık yok.</p>
            ) : (
              <ul className="space-y-2">
                {topHabits.map((h) => (
                  <li key={h.id} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate">{h.title}</span>
                    <span className="shrink-0 font-medium text-orange-500">
                      🔥 {h.current_streak}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kredi kartı + abonelik maliyeti */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CreditCard className="size-4" /> Bu ay kredi kartı
            </div>
            <p className="text-lg font-bold">{formatCurrency(creditCardTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Package className="size-4" /> Aylık abonelik
            </div>
            <p className="text-lg font-bold">{formatCurrency(subscriptionMonthly)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rutin ilerlemesi */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-5" /> Günlük Rutinler
          </CardTitle>
          <Link href="/routines">
            <Button variant="ghost" size="sm">
              Tümü <ChevronRight className="size-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {routinesTotal === 0 ? (
            <p className="text-sm text-muted-foreground">Aktif profilde rutin yok.</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bugün</span>
                <span className="font-medium">
                  {routinesDone}/{routinesTotal} tamamlandı
                </span>
              </div>
              <ProgressBar value={(routinesDone / routinesTotal) * 100} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Aktif görevler */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="size-5" /> Aktif Görevler
          </CardTitle>
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              Tümü <ChevronRight className="size-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aktif görev yok 🎉</p>
          ) : (
            <ul className="space-y-2">
              {tasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={
                      t.priority === "CRITICAL" || t.priority === "HIGH"
                        ? "size-2 shrink-0 rounded-full bg-destructive"
                        : "size-2 shrink-0 rounded-full bg-muted-foreground/40"
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <Badge variant="outline">
                    {TASK_PRIORITIES.find((p) => p.value === t.priority)?.label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WeeklyScoreWidget initial={weekly} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aylık Bakiye</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={
                netBalance >= 0
                  ? "text-lg font-bold text-success"
                  : "text-lg font-bold text-destructive"
              }
            >
              {formatCurrency(netBalance)}
            </p>
            <Link href="/finance" className="text-xs text-primary">
              Finans →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
