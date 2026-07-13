import { redirect } from "next/navigation";
import { getCurrentUser, canCreateException } from "@/lib/dal";
import NewExceptionForm from "./new-exception-form";

export default async function NewExceptionPage() {
  const user = await getCurrentUser();
  if (!canCreateException(user.role)) {
    redirect("/exceptions");
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Log a new exception</h1>
        <p className="text-sm text-zinc-500">
          For an order that came in for an item that&apos;s out of stock, damaged, lost, or wrong. If an
          order has more than one affected item, log a separate exception for each — you&apos;ll see them
          grouped together on each exception&apos;s detail page.
        </p>
      </div>
      <NewExceptionForm />
    </div>
  );
}
