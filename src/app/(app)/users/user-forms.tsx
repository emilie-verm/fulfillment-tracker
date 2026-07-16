"use client";

import { useActionState, useState } from "react";
import { createUser, resetUserPassword, setUserActive, updateUserRole } from "@/app/actions/users";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@prisma/client";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-zinc-500">Name</label>
        <input name="name" required className="mt-1 w-40 rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">Email</label>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-56 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">Role</label>
        <select name="role" defaultValue="OUTREACH" className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm">
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">Temporary password</label>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="min. 8 characters"
          className="mt-1 w-48 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-emerald-600">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ userId, userName }: { userId: string; userName: string }) {
  const [state, action, pending] = useActionState(resetUserPassword, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-zinc-500 hover:text-zinc-800 hover:underline">
        Reset password
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input
        name="password"
        type="text"
        required
        minLength={8}
        placeholder={`New password for ${userName}`}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state?.success && <span className="text-xs text-emerald-600">{state.success}</span>}
    </form>
  );
}

export function RoleForm({ userId, currentRole }: { userId: string; currentRole: Role }) {
  const [state, action, pending] = useActionState(updateUserRole, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ActiveToggleForm({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(setUserActive, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending || (isActive && isSelf)}
        title={isActive && isSelf ? "You can't deactivate your own account" : undefined}
        className={`rounded-md px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
          isActive
            ? "bg-red-50 text-red-700 hover:bg-red-100"
            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {pending ? "Saving…" : isActive ? "Deactivate" : "Reactivate"}
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
