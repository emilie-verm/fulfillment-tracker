import Link from "next/link";
import type { Exception } from "@prisma/client";
import { AgingFlag, ExceptionTypeBadge, StageBadge } from "@/components/badges";

export function ExceptionsTable({ exceptions }: { exceptions: Exception[] }) {
  if (exceptions.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-400">
        No exceptions match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
          <tr>
            <th className="px-3 py-2">Order</th>
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Stage</th>
            <th className="px-3 py-2">Aging</th>
            <th className="px-3 py-2">Logged</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {exceptions.map((exception) => (
            <tr key={exception.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2">
                <Link href={`/exceptions/${exception.id}`} className="font-medium text-zinc-900 hover:underline">
                  #{exception.orderNumber}
                </Link>
              </td>
              <td className="px-3 py-2 text-zinc-700">{exception.productName}</td>
              <td className="px-3 py-2">
                <ExceptionTypeBadge type={exception.exceptionType} />
              </td>
              <td className="px-3 py-2">
                <StageBadge stage={exception.stage} />
              </td>
              <td className="px-3 py-2">
                <AgingFlag stageChangedAt={exception.stageChangedAt} stage={exception.stage} />
              </td>
              <td className="px-3 py-2 text-zinc-500">
                {exception.createdAt.toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
