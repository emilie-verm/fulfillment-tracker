import { getCurrentUser } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/constants";
import ChangePasswordForm from "./change-password-form";

export default async function AccountPage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Your account</h1>
        <p className="text-sm text-zinc-500">
          {user.name} · {user.email} · {ROLE_LABELS[user.role]}
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
