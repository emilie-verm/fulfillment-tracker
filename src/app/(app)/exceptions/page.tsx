import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, canCreateException } from "@/lib/dal";
import { buildExceptionWhere } from "@/lib/exceptions-query";
import { ExceptionsFilterForm } from "@/components/exceptions-filter-form";
import { ExceptionsTable } from "@/components/exceptions-table";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const where = buildExceptionWhere(params, { defaultOpenOnly: true });

  const exceptions = await db.exception.findMany({
    where,
    orderBy: { stageChangedAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Exceptions</h1>
          <p className="text-sm text-zinc-500">
            Open order exceptions, sorted by how long they&apos;ve been sitting in their current stage.
          </p>
        </div>
        {canCreateException(user.role) && (
          <Link
            href="/exceptions/new"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Log new exception
          </Link>
        )}
      </div>
      <ExceptionsFilterForm params={params} action="/exceptions" showViewToggle />
      <ExceptionsTable exceptions={exceptions} />
    </div>
  );
}
