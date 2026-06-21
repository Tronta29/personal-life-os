import { formatCurrency } from "@/lib/utils";

export type CategorySlice = {
  name: string;
  color: string;
  amount: number;
};

/** Kategori bazlı yatay bar grafiği (harici bağımlılık yok) */
export function CategoryBar({ data }: { data: CategorySlice[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Bu ay için gider yok.</p>;
  }
  const sorted = [...data].filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-3">
      {sorted.map((d) => {
        const pct = (d.amount / total) * 100;
        return (
          <div key={d.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                {d.name}
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(d.amount)} · %{pct.toFixed(0)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: d.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
