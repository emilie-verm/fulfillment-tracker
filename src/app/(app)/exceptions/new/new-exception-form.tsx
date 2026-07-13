"use client";

import { useActionState } from "react";
import { createException } from "@/app/actions/exceptions";
import { EXCEPTION_TYPE_LABELS } from "@/lib/constants";

export default function NewExceptionForm() {
  const [state, action, pending] = useActionState(createException, undefined);

  return (
    <form action={action} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Order number</label>
          <input
            name="orderNumber"
            required
            placeholder="e.g. 1234"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Product</label>
          <input
            name="productName"
            required
            placeholder="e.g. sour strawberry banana"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Exception type</label>
        <select
          name="exceptionType"
          defaultValue="OUT_OF_STOCK"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {Object.entries(EXCEPTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Notes (optional)</label>
        <textarea
          name="fulfillmentNotes"
          rows={3}
          placeholder="Anything Mary should know before reaching out"
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Logging…" : "Log exception"}
      </button>
    </form>
  );
}
