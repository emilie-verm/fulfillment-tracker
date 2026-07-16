"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canCommentOnStock, canConfirmWebsiteUpdate, canEditStock, getCurrentUser } from "@/lib/dal";
import { notifyUserIds, resolveMentions } from "@/lib/notifications";

const STOCK_STATUSES = ["OUT_OF_STOCK", "LOW_STOCK", "HIGH_STOCK"] as const;

const StockCheckSchema = z.object({
  productName: z.string().trim().min(1, "Product is required"),
  status: z.enum(STOCK_STATUSES),
  notes: z.string().trim().optional(),
});

export type ActionResult = { error?: string } | undefined;

function requireStockCheckId(formData: FormData): string {
  const id = formData.get("stockCheckId");
  if (typeof id !== "string" || !id) {
    throw new Error("Missing stockCheckId");
  }
  return id;
}

function revalidateStock() {
  revalidatePath("/stock");
  revalidatePath("/dashboard");
}

export async function addStockCheck(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canEditStock(user.role)) {
    return { error: "You don't have permission to update stock levels." };
  }

  const parsed = StockCheckSchema.safeParse({
    productName: formData.get("productName"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.stockCheck.create({
    data: {
      productName: parsed.data.productName,
      status: parsed.data.status,
      notes: parsed.data.notes,
      checkedById: user.id,
    },
  });

  revalidateStock();
  return undefined;
}

// ---- Admin-only: confirm the website was actually updated to match --------

export async function confirmWebsiteUpdated(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireStockCheckId(formData);
  const user = await getCurrentUser();
  if (!canConfirmWebsiteUpdate(user.role)) {
    return { error: "Only an admin can confirm this." };
  }

  const check = await db.stockCheck.findUnique({ where: { id } });
  if (!check) return { error: "Not found." };

  const nowConfirmed = !check.websiteUpdatedAt;

  await db.stockCheck.update({
    where: { id },
    data: nowConfirmed
      ? { websiteUpdatedAt: new Date(), websiteUpdatedById: user.id }
      : { websiteUpdatedAt: null, websiteUpdatedById: null },
  });

  revalidateStock();
  return undefined;
}

// ---- Archive (dismiss from the active tables, keep in history) ------------

export async function toggleStockArchive(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireStockCheckId(formData);
  const user = await getCurrentUser();
  if (!canEditStock(user.role)) {
    return { error: "You don't have permission to archive this." };
  }

  const check = await db.stockCheck.findUnique({ where: { id } });
  if (!check) return { error: "Not found." };

  const nowArchived = !check.archivedAt;

  await db.stockCheck.update({
    where: { id },
    data: nowArchived
      ? { archivedAt: new Date(), archivedById: user.id }
      : { archivedAt: null, archivedById: null },
  });

  revalidateStock();
  return undefined;
}

// ---- Comments (Fulfillment/Outreach/Admin, not Viewer) --------------------

const AddStockCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty"),
});

export async function addStockComment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireStockCheckId(formData);
  const user = await getCurrentUser();
  if (!canCommentOnStock(user.role)) {
    return { error: "You don't have permission to comment." };
  }

  const check = await db.stockCheck.findUnique({ where: { id } });
  if (!check) return { error: "Not found." };

  const parsed = AddStockCommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.stockCheckComment.create({
    data: { stockCheckId: id, authorId: user.id, body: parsed.data.body },
  });

  // Unlike exception comments, stock comments only notify when @mentioned —
  // no blanket broadcast, since these are usually a targeted restock ask
  // (e.g. "@Camille can we get more of this?") rather than a status update
  // everyone needs to see.
  const mentioned = await resolveMentions(parsed.data.body);
  if (mentioned.length > 0) {
    await notifyUserIds(
      mentioned.map((m) => m.id),
      {
        stockCheckId: id,
        message: `${user.name} mentioned you on ${check.productName} stock: "${parsed.data.body.slice(0, 120)}"`,
        excludeUserId: user.id,
      }
    );
  }

  revalidateStock();
  return undefined;
}
