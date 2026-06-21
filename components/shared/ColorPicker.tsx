import { cn } from "@/lib/utils";

export const PRESET_COLORS = [
  "#3182ce",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#64748b",
  "#10b981",
  "#f97316",
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "size-7 rounded-full border-2 transition-transform",
            value === c ? "scale-110 border-foreground" : "border-transparent"
          )}
          style={{ backgroundColor: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}
