import { db } from "@/lib/db";
import { canEditStock, getCurrentUser } from "@/lib/dal";
import { getCurrentStockLevels } from "@/lib/stock";
import { StockStatusBadge } from "@/components/badges";
import AddStockForm from "./add-stock-form";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const user = await getCurrentUser();
  const [levels, recentChecks] = await Promise.all([
    getCurrentStockLevels(),
    db.stockCheck.findMany({
      orderBy: { checkedAt: "desc" },
      take: 25,
      include: { checkedBy: { select: { name: true } } },
    }),
  ]);

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

      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Current levels</h2>
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {levels.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-400">No stock checks logged yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Last checked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {levels.map((level) => (
                  <tr key={level.id}>
                    <td className="px-3 py-2 font-medium text-zinc-900">{level.productName}</td>
                    <td className="px-3 py-2">
                      <StockStatusBadge status={level.status} />
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{level.notes}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {level.checkedBy.name} · {level.checkedAt.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
