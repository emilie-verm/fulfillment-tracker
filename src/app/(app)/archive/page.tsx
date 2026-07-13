import { db } from "@/lib/db";
import { buildExceptionWhere } from "@/lib/exceptions-query";
import { ExceptionsFilterForm } from "@/components/exceptions-filter-form";
import { ExceptionsTable } from "@/components/exceptions-table";

export const dynamic = "force-dynamic";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const where = buildExceptionWhere(params, { defaultOpenOnly: false });

  const exceptions = await db.exception.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const exportQuery = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Archive</h1>
          <p className="text-sm text-zinc-500">
            Full history — open and resolved — for looking things up later.
          </p>
        </div>
        <a
          href={`/api/export${exportQuery ? `?${exportQuery}` : ""}`}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Export CSV
        </a>
      </div>
      <ExceptionsFilterForm params={params} action="/archive" />
      <ExceptionsTable exceptions={exceptions} />
      {exceptions.length === 500 && (
        <p className="text-xs text-zinc-400">Showing the first 500 results — narrow your filters to see more precisely.</p>
      )}
    </div>
  );
}
