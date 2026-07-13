import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrNull } from "@/lib/dal";
import { buildExceptionWhere } from "@/lib/exceptions-query";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const where = buildExceptionWhere(params, { defaultOpenOnly: false });

  const exceptions = await db.exception.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      lastUpdatedBy: { select: { name: true } },
      confirmedResolvedBy: { select: { name: true } },
    },
  });

  const headers = [
    "Order #",
    "Product",
    "Exception type",
    "Stage",
    "Resolution type",
    "Customer choice",
    "Tracking number",
    "Carrier",
    "Created at",
    "Created by",
    "Last updated at",
    "Last updated by",
    "Confirmed resolved at",
    "Confirmed resolved by",
  ];

  const rows = exceptions.map((e) => [
    e.orderNumber,
    e.productName,
    e.exceptionType,
    e.stage,
    e.resolutionType ?? "",
    e.customerChoice ?? "",
    e.trackingNumber ?? "",
    e.carrier ?? "",
    e.createdAt.toISOString(),
    e.createdBy.name,
    e.updatedAt.toISOString(),
    e.lastUpdatedBy?.name ?? "",
    e.confirmedResolvedAt?.toISOString() ?? "",
    e.confirmedResolvedBy?.name ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exceptions-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
