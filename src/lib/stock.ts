import "server-only";
import { db } from "@/lib/db";

// "Current" stock status per product = the most recent check logged for
// that exact product name. Freeform text entry means inconsistent casing
// (e.g. "Mini Burgers" vs "mini burgers") will show as separate rows —
// that's a known tradeoff of not having a fixed product list.
export async function getCurrentStockLevels() {
  const checks = await db.stockCheck.findMany({
    orderBy: { checkedAt: "desc" },
    include: {
      checkedBy: { select: { name: true } },
      websiteUpdatedBy: { select: { name: true } },
      archivedBy: { select: { name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  const latestByProduct = new Map<string, (typeof checks)[number]>();
  for (const check of checks) {
    if (!latestByProduct.has(check.productName)) {
      latestByProduct.set(check.productName, check);
    }
  }

  return Array.from(latestByProduct.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName)
  );
}
