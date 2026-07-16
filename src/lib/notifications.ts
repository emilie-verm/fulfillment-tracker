import "server-only";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

// Creates one Notification row per matching user. In-app only — surfaced via
// the bell icon in the nav, not email/SMS. excludeUserId keeps the person who
// triggered the change from notifying themselves.
export async function notifyRoles(
  roles: Role[],
  opts: { exceptionId?: string; message: string; excludeUserId?: string }
) {
  const users = await db.user.findMany({
    where: {
      role: { in: roles },
      ...(opts.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (users.length === 0) return;

  await db.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      exceptionId: opts.exceptionId,
      message: opts.message,
    })),
  });
}

// Notify everyone except the actor — used when a new exception is logged, so
// whichever side didn't create it knows to look at it.
export async function notifyEveryoneExcept(
  excludeUserId: string,
  opts: { exceptionId?: string; message: string }
) {
  await notifyRoles(["FULFILLMENT", "OUTREACH", "ADMIN"], {
    ...opts,
    excludeUserId,
  });
}
