// Uygulama genelinde kullanılan enum ve sabitler

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "POSTPONED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskCategory =
  | "Tez"
  | "Alvo Studio"
  | "SocialMind"
  | "Kişisel"
  | "Diğer";

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED";

export type TransactionType = "INCOME" | "EXPENSE";

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "Yapılacak" },
  { value: "IN_PROGRESS", label: "Devam Ediyor" },
  { value: "COMPLETED", label: "Tamamlandı" },
  { value: "POSTPONED", label: "Ertelendi" },
  { value: "CANCELLED", label: "İptal" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Düşük" },
  { value: "MEDIUM", label: "Orta" },
  { value: "HIGH", label: "Yüksek" },
  { value: "CRITICAL", label: "Kritik" },
];

export const TASK_CATEGORIES: TaskCategory[] = [
  "Tez",
  "Alvo Studio",
  "SocialMind",
  "Kişisel",
  "Diğer",
];

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "ON_HOLD", label: "Beklemede" },
  { value: "COMPLETED", label: "Tamamlandı" },
];

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};
