import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/constants";
import { CreateUserForm, ResetPasswordForm } from "./user-forms";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Users</h1>
        <p className="text-sm text-zinc-500">Admin only. Add teammates and reset passwords here.</p>
      </div>

      <CreateUserForm />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2 font-medium text-zinc-900">{u.name}</td>
                <td className="px-3 py-2 text-zinc-600">{u.email}</td>
                <td className="px-3 py-2 text-zinc-600">{ROLE_LABELS[u.role]}</td>
                <td className="px-3 py-2">
                  <ResetPasswordForm userId={u.id} userName={u.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
