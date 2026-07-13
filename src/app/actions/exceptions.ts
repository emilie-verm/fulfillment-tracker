"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  canConfirmResolved,
  canCreateException,
  canEditFulfillmentFields,
  canEditOutreachFields,
  getCurrentUser,
} from "@/lib/dal";
import type { ExceptionStage } from "@prisma/client";

const EXCEPTION_TYPES = ["OUT_OF_STOCK", "DAMAGED", "LOST", "WRONG_ITEM", "OTHER"] as const;
const RESOLUTION_TYPES = ["REPLACEMENT_SHIPPED", "REFUNDED", "NO_RESPONSE", "OTHER"] as const;
const STAGES = [
  "LOGGED",
  "OUTREACH_SENT",
  "CUSTOMER_RESPONDED",
  "FULFILLED",
  "CONFIRMED_RESOLVED",
  "CLOSED_NO_RESPONSE",
] as const;

function revalidateAll(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/exceptions");
  revalidatePath("/archive");
  if (id) revalidatePath(`/exceptions/${id}`);
}

async function logEvent(exceptionId: string, actorId: string, action: string) {
  await db.exceptionEvent.create({
    data: { exceptionId, actorId, action },
  });
}

export type ActionResult = { error?: string } | undefined;

// Every action below is invoked from a <form> with a hidden `exceptionId`
// field so it can be used directly with useActionState (which always calls
// action(prevState, formData) — there's no slot for a bound extra argument).
function requireExceptionId(formData: FormData): string {
  const id = formData.get("exceptionId");
  if (typeof id !== "string" || !id) {
    throw new Error("Missing exceptionId");
  }
  return id;
}

// ---- Create ---------------------------------------------------------------

const CreateSchema = z.object({
  orderNumber: z.string().trim().min(1, "Order number is required"),
  productName: z.string().trim().min(1, "Product is required"),
  exceptionType: z.enum(EXCEPTION_TYPES),
  fulfillmentNotes: z.string().trim().optional(),
});

export async function createException(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canCreateException(user.role)) {
    return { error: "You don't have permission to log exceptions." };
  }

  const parsed = CreateSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    productName: formData.get("productName"),
    exceptionType: formData.get("exceptionType"),
    fulfillmentNotes: formData.get("fulfillmentNotes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;

  const created = await db.exception.create({
    data: {
      orderNumber: data.orderNumber,
      productName: data.productName,
      exceptionType: data.exceptionType,
      fulfillmentNotes: data.fulfillmentNotes,
      stage: "LOGGED",
      stageChangedAt: new Date(),
      createdById: user.id,
      lastUpdatedById: user.id,
    },
  });

  await logEvent(
    created.id,
    user.id,
    `Logged exception: order ${data.orderNumber} — ${data.productName} (${data.exceptionType.replace(/_/g, " ").toLowerCase()})`
  );

  revalidateAll(created.id);
  redirect(`/exceptions/${created.id}`);
}

// ---- Fulfillment (Camille) fields -----------------------------------------

const FulfillmentFieldsSchema = z.object({
  orderNumber: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  exceptionType: z.enum(EXCEPTION_TYPES),
  fulfillmentNotes: z.string().trim().optional(),
});

export async function updateFulfillmentFields(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditFulfillmentFields(user.role)) {
    return { error: "You don't have permission to edit these fields." };
  }

  const parsed = FulfillmentFieldsSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    productName: formData.get("productName"),
    exceptionType: formData.get("exceptionType"),
    fulfillmentNotes: formData.get("fulfillmentNotes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.exception.update({
    where: { id },
    data: { ...parsed.data, lastUpdatedById: user.id },
  });

  await logEvent(id, user.id, "Updated exception details");
  revalidateAll(id);
  return undefined;
}

// ---- Outreach (Mary) status transitions -----------------------------------

export async function markOutreachSent(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditOutreachFields(user.role)) {
    return { error: "You don't have permission to update outreach status." };
  }

  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };
  if (exception.stage !== "LOGGED") {
    return { error: "Outreach can only be marked sent from the 'logged' stage." };
  }

  await db.exception.update({
    where: { id },
    data: { stage: "OUTREACH_SENT", stageChangedAt: new Date(), lastUpdatedById: user.id },
  });
  await logEvent(id, user.id, "Marked outreach as sent to customer");
  revalidateAll(id);
  return undefined;
}

const OutreachNotesSchema = z.object({
  outreachNotes: z.string().trim().optional(),
});

export async function updateOutreachNotes(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditOutreachFields(user.role)) {
    return { error: "You don't have permission to edit outreach notes." };
  }
  const parsed = OutreachNotesSchema.safeParse({
    outreachNotes: formData.get("outreachNotes") || undefined,
  });
  if (!parsed.success) return { error: "Invalid input." };

  await db.exception.update({
    where: { id },
    data: { outreachNotes: parsed.data.outreachNotes, lastUpdatedById: user.id },
  });
  await logEvent(id, user.id, "Updated outreach notes");
  revalidateAll(id);
  return undefined;
}

const RecordResponseSchema = z.object({
  customerChoice: z.string().trim().min(1, "Describe what the customer chose"),
  resolutionType: z.enum(RESOLUTION_TYPES),
});

export async function recordCustomerResponse(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditOutreachFields(user.role)) {
    return { error: "You don't have permission to record customer responses." };
  }

  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };
  if (exception.stage !== "LOGGED" && exception.stage !== "OUTREACH_SENT") {
    return { error: "Customer response can only be recorded before fulfillment." };
  }

  const parsed = RecordResponseSchema.safeParse({
    customerChoice: formData.get("customerChoice"),
    resolutionType: formData.get("resolutionType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.exception.update({
    where: { id },
    data: {
      stage: "CUSTOMER_RESPONDED",
      stageChangedAt: new Date(),
      customerChoice: parsed.data.customerChoice,
      resolutionType: parsed.data.resolutionType,
      lastUpdatedById: user.id,
    },
  });
  await logEvent(
    id,
    user.id,
    `Recorded customer response: ${parsed.data.customerChoice}`
  );
  revalidateAll(id);
  return undefined;
}

export async function closeNoResponse(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditOutreachFields(user.role)) {
    return { error: "You don't have permission to close this exception." };
  }
  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };
  if (exception.stage !== "LOGGED" && exception.stage !== "OUTREACH_SENT") {
    return { error: "Can only close as 'no response' before the customer has responded." };
  }

  await db.exception.update({
    where: { id },
    data: {
      stage: "CLOSED_NO_RESPONSE",
      stageChangedAt: new Date(),
      resolutionType: "NO_RESPONSE",
      lastUpdatedById: user.id,
    },
  });
  await logEvent(id, user.id, "Closed — customer never responded to outreach");
  revalidateAll(id);
  return undefined;
}

// ---- Fulfillment (Camille) shipping the resolution -------------------------

const MarkFulfilledSchema = z.object({
  trackingNumber: z.string().trim().min(1, "Tracking number is required"),
  carrier: z.string().trim().optional(),
});

export async function markFulfilled(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditFulfillmentFields(user.role)) {
    return { error: "You don't have permission to mark this fulfilled." };
  }

  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };
  if (exception.stage !== "CUSTOMER_RESPONDED") {
    return { error: "Can only mark fulfilled after the customer has responded." };
  }
  if (exception.resolutionType !== "REPLACEMENT_SHIPPED" && user.role !== "ADMIN") {
    return { error: "This exception isn't resolved via a reship — nothing for fulfillment to ship." };
  }

  const parsed = MarkFulfilledSchema.safeParse({
    trackingNumber: formData.get("trackingNumber"),
    carrier: formData.get("carrier") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.exception.update({
    where: { id },
    data: {
      stage: "FULFILLED",
      stageChangedAt: new Date(),
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      shippedAt: new Date(),
      lastUpdatedById: user.id,
    },
  });
  await logEvent(
    id,
    user.id,
    `Marked fulfilled — shipped with tracking ${parsed.data.trackingNumber}${parsed.data.carrier ? ` (${parsed.data.carrier})` : ""}`
  );
  revalidateAll(id);
  return undefined;
}

// ---- Admin: confirm resolution ---------------------------------------------

export async function confirmResolved(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canConfirmResolved(user.role)) {
    return { error: "Only an admin can confirm final resolution." };
  }

  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };

  const eligible =
    exception.stage === "FULFILLED" ||
    (exception.stage === "CUSTOMER_RESPONDED" &&
      (exception.resolutionType === "REFUNDED" || exception.resolutionType === "OTHER"));

  if (!eligible) {
    return { error: "Not yet ready to confirm — the corrected order hasn't gone out or been resolved." };
  }

  await db.exception.update({
    where: { id },
    data: {
      stage: "CONFIRMED_RESOLVED",
      stageChangedAt: new Date(),
      confirmedResolvedAt: new Date(),
      confirmedResolvedById: user.id,
      lastUpdatedById: user.id,
    },
  });
  await logEvent(id, user.id, "Confirmed resolved — verified the order went out / refund landed correctly");
  revalidateAll(id);
  return undefined;
}

// ---- Admin: full override (corrections, reopening) --------------------------

const AdminUpdateSchema = z.object({
  orderNumber: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  exceptionType: z.enum(EXCEPTION_TYPES),
  stage: z.enum(STAGES),
  fulfillmentNotes: z.string().trim().optional(),
  outreachNotes: z.string().trim().optional(),
  customerChoice: z.string().trim().optional(),
  resolutionType: z.union([z.enum(RESOLUTION_TYPES), z.literal("")]).optional(),
  trackingNumber: z.string().trim().optional(),
  carrier: z.string().trim().optional(),
});

export async function adminUpdateException(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Only an admin can make this change." };
  }

  const parsed = AdminUpdateSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    productName: formData.get("productName"),
    exceptionType: formData.get("exceptionType"),
    stage: formData.get("stage"),
    fulfillmentNotes: formData.get("fulfillmentNotes") || undefined,
    outreachNotes: formData.get("outreachNotes") || undefined,
    customerChoice: formData.get("customerChoice") || undefined,
    resolutionType: formData.get("resolutionType") || "",
    trackingNumber: formData.get("trackingNumber") || undefined,
    carrier: formData.get("carrier") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.exception.findUnique({ where: { id } });
  if (!existing) return { error: "Not found." };

  const newStage = parsed.data.stage as ExceptionStage;
  const stageChanged = newStage !== existing.stage;
  const enteringConfirmed = newStage === "CONFIRMED_RESOLVED" && existing.stage !== "CONFIRMED_RESOLVED";
  const leavingConfirmed = newStage !== "CONFIRMED_RESOLVED" && existing.stage === "CONFIRMED_RESOLVED";

  await db.exception.update({
    where: { id },
    data: {
      orderNumber: parsed.data.orderNumber,
      productName: parsed.data.productName,
      exceptionType: parsed.data.exceptionType,
      stage: newStage,
      stageChangedAt: stageChanged ? new Date() : existing.stageChangedAt,
      fulfillmentNotes: parsed.data.fulfillmentNotes,
      outreachNotes: parsed.data.outreachNotes,
      customerChoice: parsed.data.customerChoice,
      resolutionType: parsed.data.resolutionType ? parsed.data.resolutionType : null,
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      confirmedResolvedAt: enteringConfirmed ? new Date() : leavingConfirmed ? null : existing.confirmedResolvedAt,
      confirmedResolvedById: enteringConfirmed ? user.id : leavingConfirmed ? null : existing.confirmedResolvedById,
      lastUpdatedById: user.id,
    },
  });

  await logEvent(
    id,
    user.id,
    stageChanged
      ? `Admin correction — stage changed from "${existing.stage}" to "${newStage}"`
      : "Admin correction — edited exception fields"
  );
  revalidateAll(id);
  return undefined;
}
