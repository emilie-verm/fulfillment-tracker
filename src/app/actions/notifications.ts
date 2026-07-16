"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";

// Plain form action (no useActionState) — marks a notification read, then
// sends the user straight to the exception it's about.
export async function markNotificationReadAndGo(formData: FormData) {
  const user = await getCurrentUser();
  const id = formData.get("notificationId");

  if (typeof id === "string" && id) {
    const notification = await db.notification.findUnique({ where: { id } });
    if (notification && notification.userId === user.id) {
      if (!notification.readAt) {
        await db.notification.update({ where: { id }, data: { readAt: new Date() } });
      }
      revalidatePath("/notifications");
      if (notification.exceptionId) {
        redirect(`/exceptions/${notification.exceptionId}`);
      }
    }
  }

  redirect("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}
