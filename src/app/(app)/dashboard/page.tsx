import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStockLevels } from "@/lib/stock";
import { AgingFlag, ExceptionTypeBadge, StageBadge } from "@/components/badges";
import { TERMINAL_STAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [awaitingResponse, readyToFulfill, readyToConfirm, recentlyDone, stockLevels] =
    await Promise.all([
      db.exception.findMany({
        where: { stage: { in: ["LOGGED", "OUTREACH_SENT"] } },
        orderBy: { stageChangedAt: "asc" },
      }),
      db.exception.findMany({
        where: { stage: "CUSTOMER_RESPONDED", resolutionType: "REPLACEMENT_SHIPPED" },
        orderBy: { stageChangedAt: "asc" },
      }),
      db.exception.findMany({
        where: {
          OR: [
            { stage: "FULFILLED" },
            { stage: "CUSTOMER_RESPONDED", resolutionType: { in: ["REFUNDED", "OTHER"] } },
          ],
        },
        orderBy: { stageChangedAt: "asc" },
      }),
      db.exception.findMany({
        where: { stage: { in: TERMINAL_STAGES } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      getCurrentStockLevels(),
    ]);

  const openCount = awaitingResponse.length + readyToFulfill.length + readyToConfirm.length;
  // Drops out once the website's been confirmed updated to match, or once
  // archived — this tile tracks what still needs action, not just the raw
  // OOS/low count.
  const lowOrOosCount = stockLevels.filter(
    (s) => (s.status === "OUT_OF_STOCK" || s.status === "LOW_STOCK") && !s.websiteUpdatedAt && !s.archivedAt
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          What&apos;s open, what&apos;s waiting on whom, and what&apos;s at risk of falling through the cracks.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Open exceptions" value={openCount} href="/exceptions" />
        <StatTile
          label="Awaiting customer"
          value={awaitingResponse.length}
          href="/exceptions?stage=LOGGED,OUTREACH_SENT"
        />
        <StatTile
          label="Ready for Camille"
          value={readyToFulfill.length}
          href="/exceptions?stage=CUSTOMER_RESPONDED&resolutionType=REPLACEMENT_SHIPPED"
        />
        <StatTile
          label="Low/OOS needing website update"
          value={lowOrOosCount}
          href="/stock"
          tone={lowOrOosCount > 0 ? "warn" : "ok"}
        />
      </div>

      <Section
        title="Awaiting customer response"
        subtitle="Mary needs to reach out or is waiting to hear back."
        exceptions={awaitingResponse}
      />
      <Section
        title="Ready for Camille to fulfill"
        subtitle="Customer picked a replacement — needs to ship."
        exceptions={readyToFulfill}
      />
      <Section
        title="Ready for final confirmation"
        subtitle="Shipped or refunded — needs admin sign-off before it's crossed off."
        exceptions={readyToConfirm}
      />

      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Recently resolved</h2>
        <div className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {recentlyDone.length === 0 && (
            <p className="p-4 text-sm text-zinc-400">Nothing resolved yet.</p>
          )}
          {recentlyDone.map((exception) => (
            <Link
              key={exception.id}
              href={`/exceptions/${exception.id}`}
              className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-zinc-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-zinc-900">#{exception.orderNumber}</span>
                <span className="text-zinc-500">{exception.productName}</span>
              </div>
              <StageBadge stage={exception.stage} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  href,
  tone = "ok",
}: {
  label: string;
  value: number;
  href?: string;
  tone?: "ok" | "warn";
}) {
  const content = (
    <div
      className={`rounded-lg border p-4 ${
        tone === "warn" && value > 0
          ? "border-amber-200 bg-amber-50"
          : "border-zinc-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function Section({
  title,
  subtitle,
  exceptions,
}: {
  title: string;
  subtitle: string;
  exceptions: Array<{
    id: string;
    orderNumber: string;
    productName: string;
    exceptionType: import("@prisma/client").ExceptionType;
    stage: import("@prisma/client").ExceptionStage;
    stageChangedAt: Date;
  }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <p className="text-xs text-zinc-500">{subtitle}</p>
      <div className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {exceptions.length === 0 && (
          <p className="p-4 text-sm text-zinc-400">Nothing here right now.</p>
        )}
        {exceptions.map((exception) => (
          <Link
            key={exception.id}
            href={`/exceptions/${exception.id}`}
            className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-zinc-50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-zinc-900">#{exception.orderNumber}</span>
              <span className="text-zinc-600">{exception.productName}</span>
              <ExceptionTypeBadge type={exception.exceptionType} />
            </div>
            <div className="flex items-center gap-3">
              <AgingFlag stageChangedAt={exception.stageChangedAt} stage={exception.stage} />
              <StageBadge stage={exception.stage} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
