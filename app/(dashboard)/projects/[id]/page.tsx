import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ProjectDetailActions } from "@/components/projects/ProjectDetailActions";
import { formatCurrency, formatTrDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { PROJECT_STATUSES, TASK_STATUSES, type ProjectStatus } from "@/types";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<ProjectStatus, "success" | "warning" | "secondary"> = {
  ACTIVE: "success",
  ON_HOLD: "warning",
  COMPLETED: "secondary",
};
const PROJECT_STATUS_LABEL = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label])
);
const TASK_STATUS_LABEL = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, s.label]));

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { created_at: "desc" } },
      transactions: {
        where: { type: "EXPENSE" },
        orderBy: { transaction_date: "desc" },
        include: { category: { select: { name: true, color: true } } },
      },
    },
  });

  if (!project) notFound();

  const taskTotal = project.tasks.length;
  const taskCompleted = project.tasks.filter((t) => t.status === "COMPLETED").length;
  const pct = taskTotal ? (taskCompleted / taskTotal) * 100 : 0;
  const totalSpend = project.transactions.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Projeler
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[project.status as ProjectStatus]}>
          {PROJECT_STATUS_LABEL[project.status]}
        </Badge>
      </div>

      <ProjectDetailActions
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          color: project.color,
          status: project.status as ProjectStatus,
        }}
      />

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">İlerleme</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-bold">%{pct.toFixed(0)}</p>
            <ProgressBar value={pct} />
            <p className="mt-2 text-xs text-muted-foreground">
              {taskCompleted}/{taskTotal} görev tamamlandı
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Toplam Harcama</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {project.transactions.length} gider kaydı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Görevler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Görevler</CardTitle>
        </CardHeader>
        <CardContent>
          {project.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu projeye bağlı görev yok.</p>
          ) : (
            <ul className="space-y-2">
              {project.tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span
                    className={
                      t.status === "COMPLETED" || t.status === "CANCELLED"
                        ? "min-w-0 flex-1 truncate text-muted-foreground line-through"
                        : "min-w-0 flex-1 truncate"
                    }
                  >
                    {t.title}
                  </span>
                  <Badge variant="outline">{TASK_STATUS_LABEL[t.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Giderler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Giderler</CardTitle>
        </CardHeader>
        <CardContent>
          {project.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu projeye bağlı gider yok.</p>
          ) : (
            <ul className="space-y-2">
              {project.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{t.description || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.category?.name ?? "Kategorisiz"} ·{" "}
                      {formatTrDate(t.transaction_date)}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-destructive">
                    -{formatCurrency(Number(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
