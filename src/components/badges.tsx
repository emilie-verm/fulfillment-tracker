import type { ExceptionStage, ExceptionType, StockStatus } from "@prisma/client";
import {
  EXCEPTION_TYPE_LABELS,
  STAGE_COLORS,
  STAGE_LABELS,
  STOCK_STATUS_COLORS,
  STOCK_STATUS_LABELS,
  agingLevel,
  daysSince,
} from "@/lib/constants";

export function StageBadge({ stage }: { stage: ExceptionStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STAGE_COLORS[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function ExceptionTypeBadge({ type }: { type: ExceptionType }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-500/20">
      {EXCEPTION_TYPE_LABELS[type]}
    </span>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STOCK_STATUS_COLORS[status]}`}
    >
      {STOCK_STATUS_LABELS[status]}
    </span>
  );
}

export function AgingFlag({
  stageChangedAt,
  stage,
}: {
  stageChangedAt: Date;
  stage: ExceptionStage;
}) {
  const level = agingLevel(stageChangedAt, stage);
  const days = daysSince(stageChangedAt);

  if (level === "ok") {
    return <span className="text-xs text-zinc-400">{days === 0 ? "today" : `${days}d in stage`}</span>;
  }

  const color = level === "critical" ? "text-red-600" : "text-amber-600";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.515-2.63L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      {days}d in stage {level === "critical" ? "— stuck?" : ""}
    </span>
  );
}
