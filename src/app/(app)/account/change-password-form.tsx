"use client";

import { useActionState } from "react";
import { changeOwnPassword } from "@/app/actions/users";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, undefined);
  return (
    <form action={action} className="max-w-sm space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-zinc-500">Current password</label>
        <input
          name="currentPassword"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500">New password</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
