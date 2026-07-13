"use client";

import { useActionState } from "react";
import { addStockCheck } from "@/app/actions/stock";
import { STOCK_STATUS_LABELS } from "@/lib/constants";

export default function AddStockForm() {
  const [state, action, pending] = useActionState(addStockCheck, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-zinc-500">Product</label>
        <input
          name="productName"
          required
          placeholder="e.g. mini burgers"
          className="mt-1 w-48 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">Status</label>
        <select
          name="status"
          defaultValue="LOW_STOCK"
          className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(STOCK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-zinc-500">Notes (optional)</label>
        <input
          name="notes"
          placeholder="e.g. 3 units left in the room"
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Log check"}
      </button>
    </form>
  );
}
