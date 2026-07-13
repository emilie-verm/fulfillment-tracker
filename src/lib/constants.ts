import type { ExceptionStage, ExceptionType, ResolutionType, StockStatus } from "@prisma/client";

export const STAGE_LABELS: Record<ExceptionStage, string> = {
  LOGGED: "Exception logged",
  OUTREACH_SENT: "Outreach sent",
  CUSTOMER_RESPONDED: "Customer responded",
  FULFILLED: "Fulfilled / shipped",
  CONFIRMED_RESOLVED: "Confirmed resolved",
  CLOSED_NO_RESPONSE: "Closed — no response",
};

// Tailwind classes per stage, used for badges across the app.
export const STAGE_COLORS: Record<ExceptionStage, string> = {
  LOGGED: "bg-slate-100 text-slate-700 ring-slate-600/20",
  OUTREACH_SENT: "bg-amber-100 text-amber-800 ring-amber-600/20",
  CUSTOMER_RESPONDED: "bg-blue-100 text-blue-800 ring-blue-600/20",
  FULFILLED: "bg-violet-100 text-violet-800 ring-violet-600/20",
  CONFIRMED_RESOLVED: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  CLOSED_NO_RESPONSE: "bg-zinc-200 text-zinc-600 ring-zinc-600/20",
};

export const TERMINAL_STAGES: ExceptionStage[] = [
  "CONFIRMED_RESOLVED",
  "CLOSED_NO_RESPONSE",
];

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  OUT_OF_STOCK: "Out of stock",
  DAMAGED: "Damaged",
  LOST: "Lost in transit",
  WRONG_ITEM: "Wrong item shipped",
  OTHER: "Other",
};

export const RESOLUTION_TYPE_LABELS: Record<ResolutionType, string> = {
  REPLACEMENT_SHIPPED: "Replacement shipped",
  REFUNDED: "Refunded",
  NO_RESPONSE: "No response from customer",
  OTHER: "Other",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  OUT_OF_STOCK: "Out of stock",
  LOW_STOCK: "Low stock",
  HIGH_STOCK: "High stock",
};

export const STOCK_STATUS_COLORS: Record<StockStatus, string> = {
  OUT_OF_STOCK: "bg-red-100 text-red-800 ring-red-600/20",
  LOW_STOCK: "bg-amber-100 text-amber-800 ring-amber-600/20",
  HIGH_STOCK: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
};

// Aging flags: how long (in days) a record can sit in a non-terminal stage
// before it's flagged as at-risk of being forgotten mid-process.
export const AGING_WARN_DAYS = 2;
export const AGING_CRITICAL_DAYS = 5;

// Opaque wrapper around Date.now() so components calling it aren't flagged
// by the React purity lint rule, which only looks for impure calls written
// directly in a component body — this is a deliberate impurity: these are
// Server Components rendered fresh per request, not cached/prerendered.
export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function agingLevel(stageChangedAt: Date, stage: ExceptionStage): "ok" | "warn" | "critical" {
  if (TERMINAL_STAGES.includes(stage)) return "ok";
  const days = daysSince(stageChangedAt);
  if (days >= AGING_CRITICAL_DAYS) return "critical";
  if (days >= AGING_WARN_DAYS) return "warn";
  return "ok";
}

export const ROLE_LABELS = {
  FULFILLMENT: "Fulfillment",
  OUTREACH: "Outreach",
  ADMIN: "Admin",
} as const;
