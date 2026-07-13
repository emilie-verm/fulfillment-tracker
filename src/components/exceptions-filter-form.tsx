import { EXCEPTION_TYPE_LABELS, STAGE_LABELS } from "@/lib/constants";
import type { ExceptionSearchParams } from "@/lib/exceptions-query";

export function ExceptionsFilterForm({
  params,
  action,
  showViewToggle,
}: {
  params: ExceptionSearchParams;
  action: string;
  showViewToggle?: boolean;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <Field label="Order #">
        <input
          type="text"
          name="orderNumber"
          defaultValue={params.orderNumber}
          className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Product">
        <input
          type="text"
          name="productName"
          defaultValue={params.productName}
          className="w-40 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Stage">
        <select
          name="stage"
          defaultValue={params.stage ?? ""}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">Any</option>
          {Object.entries(STAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select
          name="exceptionType"
          defaultValue={params.exceptionType ?? ""}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">Any</option>
          {Object.entries(EXCEPTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="From">
        <input
          type="date"
          name="from"
          defaultValue={params.from}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="To">
        <input
          type="date"
          name="to"
          defaultValue={params.to}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </Field>
      {showViewToggle && (
        <Field label="Show">
          <select
            name="view"
            defaultValue={params.view ?? "open"}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="open">Open only</option>
            <option value="all">All</option>
          </select>
        </Field>
      )}
      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Filter
      </button>
      <a href={action} className="text-sm text-zinc-500 hover:text-zinc-800">
        Clear
      </a>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
