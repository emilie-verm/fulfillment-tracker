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
      isActive: true,
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

// Notify exact users by ID — used for @mentions, where the person doing the
// notifying should be excluded even if they mentioned themselves.
export async function notifyUserIds(
  userIds: string[],
  opts: { exceptionId?: string; message: string; excludeUserId?: string }
) {
  const ids = [...new Set(userIds)].filter((id) => id !== opts.excludeUserId);
  if (ids.length === 0) return;

  const users = await db.user.findMany({
    where: { id: { in: ids }, isActive: true },
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

// Matches @name tokens (letters/numbers/underscore, e.g. "@Camille") against
// active users by first name, case-insensitively. Simple by design — this
// team is a handful of people with distinct first names, not a full
// @-mention autocomplete system.
export async function resolveMentions(body: string) {
  const tokens = [...body.matchAll(/@(\w+)/g)].map((m) => m[1].toLowerCase());
  if (tokens.length === 0) return [];

  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const matched = users.filter((u) => {
    const firstName = u.name.split(/\s+/)[0]?.toLowerCase();
    return tokens.includes(firstName);
  });

  return matched;
}
