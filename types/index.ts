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

// ===== Hedefler =====
export type GoalType = "NUMERIC" | "BOOLEAN" | "DATE";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "NUMERIC", label: "Sayısal (hedef değer)" },
  { value: "BOOLEAN", label: "Evet / Hayır" },
  { value: "DATE", label: "Tarihe kadar" },
];

export const GOAL_STATUSES: { value: GoalStatus; label: string }[] = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "COMPLETED", label: "Tamamlandı" },
  { value: "CANCELLED", label: "İptal" },
];

// ===== Ödeme yöntemi =====
export type PaymentMethod = "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "TRANSFER";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Nakit" },
  { value: "CREDIT_CARD", label: "Kredi Kartı" },
  { value: "DEBIT_CARD", label: "Banka Kartı" },
  { value: "TRANSFER", label: "Havale/EFT" },
];

// ===== Abonelik / Taksit =====
export type SubscriptionPeriod = "MONTHLY" | "YEARLY";

export const SUBSCRIPTION_PERIODS: { value: SubscriptionPeriod; label: string }[] = [
  { value: "MONTHLY", label: "Aylık" },
  { value: "YEARLY", label: "Yıllık" },
];
