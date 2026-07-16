import Link from "next/link";
import type { Exception } from "@prisma/client";
import { AgingFlag, ExceptionTypeBadge, StageBadge } from "@/components/badges";

// Groups exceptions by order number so multiple exceptions on the same order
// render as one cluster instead of looking like unrelated rows — otherwise
// it's easy to mistake them for separate orders/customers (e.g. Mary sending
// two separate outreach emails for what's really one order with two OOS items).
function groupByOrderNumber(exceptions: Exception[]) {
  const order: string[] = [];
  const groups = new Map<string, Exception[]>();
  for (const exception of exceptions) {
    if (!groups.has(exception.orderNumber)) {
      groups.set(exception.orderNumber, []);
      order.push(exception.orderNumber);
    }
    groups.get(exception.orderNumber)!.push(exception);
  }
  return order.map((orderNumber) => ({
    orderNumber,
    items: groups.get(orderNumber)!,
  }));
}

export function ExceptionsTable({ exceptions }: { exceptions: Exception[] }) {
  if (exceptions.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400">
        No exceptions match these filters.
      </p>
    );
  }

  const groups = groupByOrderNumber(exceptions);

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.orderNumber} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="text-sm font-semibold text-zinc-900">Order #{group.orderNumber}</span>
            {group.items.length > 1 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                {group.items.length} exceptions on this order
              </span>
            )}
          </div>
          <div className="divide-y divide-zinc-100">
            {group.items.map((exception) => (
              <Link
                key={exception.id}
                href={`/exceptions/${exception.id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-zinc-50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-700">{exception.productName}</span>
                  <ExceptionTypeBadge type={exception.exceptionType} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">
                    {exception.createdAt.toLocaleDateString()}
                  </span>
                  <AgingFlag stageChangedAt={exception.stageChangedAt} stage={exception.stage} />
                  <StageBadge stage={exception.stage} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
