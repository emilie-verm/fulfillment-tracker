import { db } from "@/lib/db";
import { canCommentOnStock, canConfirmWebsiteUpdate, canEditStock, getCurrentUser } from "@/lib/dal";
import { getCurrentStockLevels } from "@/lib/stock";
import { StockStatusBadge } from "@/components/badges";
import { STOCK_STATUS_LABELS } from "@/lib/constants";
import AddStockForm from "./add-stock-form";
import { StockCommentsSection, WebsiteUpdatedControl } from "./stock-forms";
import type { StockStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_GROUPS: StockStatus[] = ["OUT_OF_STOCK", "LOW_STOCK", "HIGH_STOCK"];

export default async function StockPage() {
  const user = await getCurrentUser();
  const [levels, recentChecks, teamMembers] = await Promise.all([
    getCurrentStockLevels(),
    db.stockCheck.findMany({
      orderBy: { checkedAt: "desc" },
      take: 25,
      include: { checkedBy: { select: { name: true } } },
    }),
    db.user.findMany({
      where: { isActive: true, id: { not: user.id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const canConfirm = canConfirmWebsiteUpdate(user.role);
  const canComment = canCommentOnStock(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Stock log</h1>
        <p className="text-sm text-zinc-500">
          {canEditStock(user.role)
            ? "Log what you see after physically checking the fulfillment room."
            : "Read-only — current stock levels as last checked by fulfillment."}
        </p>
      </div>

      {canEditStock(user.role) && <AddStockForm />}

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-zinc-900">Current levels</h2>
        {levels.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400">
            No stock checks logged yet.
          </p>
        ) : (
          STATUS_GROUPS.map((status) => {
            const group = levels.filter((level) => level.status === status);
            if (group.length === 0) return null;

            return (
              <div key={status}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700">
                  {STOCK_STATUS_LABELS[status]}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                    {group.length}
                  </span>
                </h3>
                <div className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  {group.map((level) => (
                    <div key={level.id} className="p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-900">{level.productName}</p>
                          {level.notes && <p className="mt-0.5 text-sm text-zinc-600">{level.notes}</p>}
                          <p className="mt-1 text-xs text-zinc-400">
                            {level.checkedBy.name} · {level.checkedAt.toLocaleString()}
                          </p>
                        </div>
                        <WebsiteUpdatedControl
                          stockCheckId={level.id}
                          confirmed={Boolean(level.websiteUpdatedAt)}
                          confirmedByName={level.websiteUpdatedBy?.name}
                          confirmedAt={level.websiteUpdatedAt ?? undefined}
                          canConfirm={canConfirm}
                        />
                      </div>
                      <div className="mt-2">
                        <StockCommentsSection
                          stockCheckId={level.id}
                          comments={level.comments}
                          canComment={canComment}
                          teamMembers={teamMembers}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Recent checks</h2>
        <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white text-sm">
          {recentChecks.map((check) => (
            <li key={check.id} className="flex items-center justify-between gap-3 p-3">
              <span className="text-zinc-700">
                {check.productName} <StockStatusBadge status={check.status} />
              </span>
              <span className="text-xs text-zinc-400">
                {check.checkedBy.name} · {check.checkedAt.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
