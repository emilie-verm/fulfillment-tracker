"use client";

import { useActionState } from "react";
import {
  adminUpdateException,
  closeNoResponse,
  confirmResolved,
  markFulfilled,
  markOutreachSent,
  recordCustomerResponse,
  updateFulfillmentFields,
  updateOutreachNotes,
} from "@/app/actions/exceptions";
import {
  EXCEPTION_TYPE_LABELS,
  RESOLUTION_TYPE_LABELS,
  STAGE_LABELS,
} from "@/lib/constants";
import type { Exception } from "@prisma/client";

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-red-600">{error}</p>;
}

function SubmitButton({ pending, children, variant = "primary" }: { pending: boolean; children: React.ReactNode; variant?: "primary" | "danger" | "secondary" }) {
  const styles = {
    primary: "bg-zinc-900 hover:bg-zinc-700",
    danger: "bg-red-600 hover:bg-red-500",
    secondary: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
  } as const;
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${styles[variant]} ${
        variant === "secondary" ? "!text-zinc-700" : ""
      }`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

// ---- Fulfillment details form ----------------------------------------------

export function FulfillmentFieldsForm({ exception }: { exception: Exception }) {
  const [state, action, pending] = useActionState(updateFulfillmentFields, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="exceptionId" value={exception.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">Order number</label>
          <input
            name="orderNumber"
            defaultValue={exception.orderNumber}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Product</label>
          <input
            name="productName"
            defaultValue={exception.productName}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">Exception type</label>
        <select
          name="exceptionType"
          defaultValue={exception.exceptionType}
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(EXCEPTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">Fulfillment notes</label>
        <textarea
          name="fulfillmentNotes"
          defaultValue={exception.fulfillmentNotes ?? ""}
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <ErrorText error={state?.error} />
      <SubmitButton pending={pending} variant="secondary">
        Save details
      </SubmitButton>
    </form>
  );
}

// ---- Outreach: mark sent ---------------------------------------------------

export function MarkOutreachSentForm({ exceptionId }: { exceptionId: string }) {
  const [state, action, pending] = useActionState(markOutreachSent, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <ErrorText error={state?.error} />
      <SubmitButton pending={pending}>Mark outreach sent</SubmitButton>
    </form>
  );
}

// ---- Outreach notes ---------------------------------------------------------

export function OutreachNotesForm({ exception }: { exception: Exception }) {
  const [state, action, pending] = useActionState(updateOutreachNotes, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="exceptionId" value={exception.id} />
      <textarea
        name="outreachNotes"
        defaultValue={exception.outreachNotes ?? ""}
        rows={3}
        placeholder="What Mary has said to the customer, tone, follow-up dates…"
        className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <ErrorText error={state?.error} />
      <SubmitButton pending={pending} variant="secondary">
        Save notes
      </SubmitButton>
    </form>
  );
}

// ---- Record customer response -----------------------------------------------

export function RecordResponseForm({ exceptionId }: { exceptionId: string }) {
  const [state, action, pending] = useActionState(recordCustomerResponse, undefined);
  return (
    <form action={action} className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-3">
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <div>
        <label className="block text-xs font-medium text-zinc-600">What did the customer choose?</label>
        <textarea
          name="customerChoice"
          required
          rows={2}
          placeholder="e.g. wants strawberry mallows instead of sour strawberry banana"
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600">How will this resolve?</label>
        <select
          name="resolutionType"
          defaultValue="REPLACEMENT_SHIPPED"
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(RESOLUTION_TYPE_LABELS)
            .filter(([value]) => value !== "NO_RESPONSE")
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </select>
      </div>
      <ErrorText error={state?.error} />
      <SubmitButton pending={pending}>Record response</SubmitButton>
    </form>
  );
}

// ---- Close: no response -----------------------------------------------------

export function CloseNoResponseForm({ exceptionId }: { exceptionId: string }) {
  const [state, action, pending] = useActionState(closeNoResponse, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <ErrorText error={state?.error} />
      <SubmitButton pending={pending} variant="secondary">
        Close — customer never responded
      </SubmitButton>
    </form>
  );
}

// ---- Mark fulfilled ----------------------------------------------------------

export function MarkFulfilledForm({ exceptionId }: { exceptionId: string }) {
  const [state, action, pending] = useActionState(markFulfilled, undefined);
  return (
    <form action={action} className="space-y-3 rounded-md border border-violet-200 bg-violet-50 p-3">
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600">Tracking number</label>
          <input
            name="trackingNumber"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">Carrier (optional)</label>
          <input
            name="carrier"
            placeholder="FedEx, UPS…"
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <ErrorText error={state?.error} />
      <SubmitButton pending={pending}>Mark fulfilled / shipped</SubmitButton>
    </form>
  );
}

// ---- Confirm resolved (admin) ------------------------------------------------

export function ConfirmResolvedForm({ exceptionId }: { exceptionId: string }) {
  const [state, action, pending] = useActionState(confirmResolved, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <ErrorText error={state?.error} />
      <SubmitButton pending={pending}>Confirm resolved</SubmitButton>
    </form>
  );
}

// ---- Admin full override ------------------------------------------------------

export function AdminEditForm({ exception }: { exception: Exception }) {
  const [state, action, pending] = useActionState(adminUpdateException, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="exceptionId" value={exception.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">Order number</label>
          <input
            name="orderNumber"
            defaultValue={exception.orderNumber}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Product</label>
          <input
            name="productName"
            defaultValue={exception.productName}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Exception type</label>
          <select
            name="exceptionType"
            defaultValue={exception.exceptionType}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(EXCEPTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Stage (full override)</label>
          <select
            name="stage"
            defaultValue={exception.stage}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">Fulfillment notes</label>
        <textarea
          name="fulfillmentNotes"
          defaultValue={exception.fulfillmentNotes ?? ""}
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">Outreach notes</label>
        <textarea
          name="outreachNotes"
          defaultValue={exception.outreachNotes ?? ""}
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">Customer choice</label>
          <input
            name="customerChoice"
            defaultValue={exception.customerChoice ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Resolution type</label>
          <select
            name="resolutionType"
            defaultValue={exception.resolutionType ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {Object.entries(RESOLUTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Tracking number</label>
          <input
            name="trackingNumber"
            defaultValue={exception.trackingNumber ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Carrier</label>
          <input
            name="carrier"
            defaultValue={exception.carrier ?? ""}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <ErrorText error={state?.error} />
      <SubmitButton pending={pending} variant="danger">
        Save admin correction
      </SubmitButton>
    </form>
  );
}
