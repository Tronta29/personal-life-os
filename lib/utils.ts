import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Türkçe gün/ay isimleriyle tarih formatlama */
const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatTrDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return TR_DATE.format(d);
}

/** YYYY-MM-DD formatında yerel tarih (UTC kaymadan) */
export function toDateKey(date: Date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Haftanın başlangıcı (Pazartesi) - YYYY-MM-DD */
export function getWeekStart(date: Date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Pazartesi = 0
  d.setDate(d.getDate() - day);
  return toDateKey(d);
}

export function formatCurrency(amount: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
