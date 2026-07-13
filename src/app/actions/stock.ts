"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canEditStock, getCurrentUser } from "@/lib/dal";

const STOCK_STATUSES = ["OUT_OF_STOCK", "LOW_STOCK", "HIGH_STOCK"] as const;

const StockCheckSchema = z.object({
  productName: z.string().trim().min(1, "Product is required"),
  status: z.enum(STOCK_STATUSES),
  notes: z.string().trim().optional(),
});

export type ActionResult = { error?: string } | undefined;

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

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  return undefined;
}
