"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  canConfirmResolved,
  canCreateException,
  canEditException,
  getCurrentUser,
} from "@/lib/dal";
import { notifyEveryoneExcept, notifyRoles } from "@/lib/notifications";
import type { ExceptionStage, ResolutionType } from "@prisma/client";

const EXCEPTION_TYPES = [
  "OUT_OF_STOCK",
  "DAMAGED",
  "LOST",
  "WRONG_ITEM",
  "ADDRESS_UPDATE",
  "OTHER",
] as const;
const RESOLUTION_TYPES = [
  "REPLACEMENT_SHIPPED",
  "REFUNDED",
  "NO_RESPONSE",
  "ADDRESS_UPDATED",
  "OTHER",
] as const;
const STAGES = [
  "LOGGED",
  "OUTREACH_SENT",
  "CUSTOMER_RESPONDED",
  "FULFILLED",
  "CONFIRMED_RESOLVED",
  "CLOSED_NO_RESPONSE",
] as const;
// Stages assignable via the direct stage editor available to all three
// roles. CONFIRMED_RESOLVED is deliberately excluded — that one only happens
// through confirmResolved (admin-only) or the admin override panel.
const DIRECT_EDITABLE_STAGES = [
  "LOGGED",
  "OUTREACH_SENT",
  "CUSTOMER_RESPONDED",
  "FULFILLED",
  "CLOSED_NO_RESPONSE",
] as const;

// Fires the right in-app notification for a stage transition, regardless of
// which action/UI path caused it, so behavior stays consistent.
async function notifyOnStageChange(
  exceptionId: string,
  orderNumber: string,
  newStage: ExceptionStage,
  resolutionType: ResolutionType | null,
  actorId: string
) {
  if (newStage === "CUSTOMER_RESPONDED" && resolutionType === "REPLACEMENT_SHIPPED") {
    await notifyRoles(["FULFILLMENT"], {
      exceptionId,
      message: `Order #${orderNumber} — customer responded, ready for you to fulfill.`,
      excludeUserId: actorId,
    });
  } else if (
    newStage === "CUSTOMER_RESPONDED" &&
    (resolutionType === "REFUNDED" || resolutionType === "OTHER")
  ) {
    await notifyRoles(["ADMIN"], {
      exceptionId,
      message: `Order #${orderNumber} — customer responded, ready to confirm resolved.`,
      excludeUserId: actorId,
    });
  } else if (newStage === "FULFILLED") {
    const verb = resolutionType === "ADDRESS_UPDATED" ? "address updated" : "shipped";
    await notifyRoles(["ADMIN"], {
      exceptionId,
      message: `Order #${orderNumber} — ${verb}, ready to confirm resolved.`,
      excludeUserId: actorId,
    });
  }
}

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

  await notifyEveryoneExcept(user.id, {
    exceptionId: created.id,
    message: `New exception logged for order #${data.orderNumber} — ${data.productName}.`,
  });

  revalidateAll(created.id);
  redirect(`/exceptions/${created.id}`);
}

// ---- Exception details (any of the 3 roles) --------------------------------

const FulfillmentFieldsSchema = z.object({
  orderNumber: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  exceptionType: z.enum(EXCEPTION_TYPES),
  fulfillmentNotes: z.string().trim().optional(),
});

export async function updateFulfillmentFields(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditException(user.role)) {
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

// ---- Outreach status transitions --------------------------------------------

export async function markOutreachSent(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditException(user.role)) {
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
  if (!canEditException(user.role)) {
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
  if (!canEditException(user.role)) {
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
  await notifyOnStageChange(id, exception.orderNumber, "CUSTOMER_RESPONDED", parsed.data.resolutionType, user.id);
  revalidateAll(id);
  return undefined;
}

export async function closeNoResponse(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditException(user.role)) {
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
  if (!canEditException(user.role)) {
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
  await notifyOnStageChange(id, exception.orderNumber, "FULFILLED", exception.resolutionType, user.id);
  revalidateAll(id);
  return undefined;
}

// ---- Address update (skips outreach/customer-response entirely) -----------

const AddressUpdateSchema = z.object({
  correctedAddress: z.string().trim().min(1, "Enter the corrected address"),
});

export async function markAddressUpdated(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditException(user.role)) {
    return { error: "You don't have permission to do this." };
  }

  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };
  if (exception.exceptionType !== "ADDRESS_UPDATE") {
    return { error: "This action is only for address-update exceptions." };
  }
  if (exception.stage !== "LOGGED") {
    return { error: "Already marked updated." };
  }

  const parsed = AddressUpdateSchema.safeParse({
    correctedAddress: formData.get("correctedAddress"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.exception.update({
    where: { id },
    data: {
      correctedAddress: parsed.data.correctedAddress,
      stage: "FULFILLED",
      stageChangedAt: new Date(),
      resolutionType: "ADDRESS_UPDATED",
      lastUpdatedById: user.id,
    },
  });
  await logEvent(
    id,
    user.id,
    `Address corrected and updated in ShipStation: ${parsed.data.correctedAddress}`
  );
  await notifyOnStageChange(id, exception.orderNumber, "FULFILLED", "ADDRESS_UPDATED", user.id);
  revalidateAll(id);
  return undefined;
}

// ---- Carrier claim (independent of the main resolution flow) ---------------

const CarrierClaimSchema = z.object({
  filed: z.literal("on").optional(),
  reference: z.string().trim().optional(),
});

export async function updateCarrierClaim(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditException(user.role)) {
    return { error: "You don't have permission to do this." };
  }

  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };

  const parsed = CarrierClaimSchema.safeParse({
    filed: formData.get("filed") || undefined,
    reference: formData.get("reference") || undefined,
  });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const filed = parsed.data.filed === "on";

  await db.exception.update({
    where: { id },
    data: filed
      ? {
          carrierClaimFiledAt: exception.carrierClaimFiledAt ?? new Date(),
          carrierClaimFiledById: user.id,
          carrierClaimReference: parsed.data.reference,
          lastUpdatedById: user.id,
        }
      : {
          carrierClaimFiledAt: null,
          carrierClaimFiledById: null,
          carrierClaimReference: null,
          lastUpdatedById: user.id,
        },
  });
  await logEvent(
    id,
    user.id,
    filed
      ? `Marked carrier claim filed${parsed.data.reference ? ` (ref: ${parsed.data.reference})` : ""}`
      : "Unmarked carrier claim filed"
  );
  revalidateAll(id);
  return undefined;
}

// ---- Direct stage editor (any of the 3 roles, except into CONFIRMED_RESOLVED) --

const UpdateStageSchema = z.object({
  stage: z.enum(DIRECT_EDITABLE_STAGES),
});

export async function updateStage(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditException(user.role)) {
    return { error: "You don't have permission to change this." };
  }

  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };
  if (exception.stage === "CONFIRMED_RESOLVED") {
    return { error: "Already confirmed resolved — use the admin panel to reopen it." };
  }

  const parsed = UpdateStageSchema.safeParse({ stage: formData.get("stage") });
  if (!parsed.success) {
    return { error: "Invalid stage." };
  }

  if (parsed.data.stage === exception.stage) {
    return undefined;
  }

  await db.exception.update({
    where: { id },
    data: { stage: parsed.data.stage, stageChangedAt: new Date(), lastUpdatedById: user.id },
  });
  await logEvent(
    id,
    user.id,
    `Stage changed directly from "${exception.stage}" to "${parsed.data.stage}"`
  );
  await notifyOnStageChange(id, exception.orderNumber, parsed.data.stage, exception.resolutionType, user.id);
  revalidateAll(id);
  return undefined;
}

// ---- Comments (any of the 3 roles) ------------------------------------------

const AddCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty"),
});

export async function addComment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = requireExceptionId(formData);
  const user = await getCurrentUser();
  if (!canEditException(user.role)) {
    return { error: "You don't have permission to comment on this." };
  }

  const exception = await db.exception.findUnique({ where: { id } });
  if (!exception) return { error: "Not found." };

  const parsed = AddCommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.exceptionComment.create({
    data: { exceptionId: id, authorId: user.id, body: parsed.data.body },
  });

  await notifyEveryoneExcept(user.id, {
    exceptionId: id,
    message: `${user.name} commented on order #${exception.orderNumber}.`,
  });

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
  correctedAddress: z.string().trim().optional(),
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
    correctedAddress: formData.get("correctedAddress") || undefined,
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
      correctedAddress: parsed.data.correctedAddress,
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
  if (stageChanged) {
    const finalResolutionType = parsed.data.resolutionType ? parsed.data.resolutionType : null;
    await notifyOnStageChange(id, parsed.data.orderNumber, newStage, finalResolutionType, user.id);
  }
  revalidateAll(id);
  return undefined;
}
