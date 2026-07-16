import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { decrypt, getSessionCookie } from "@/lib/session";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

// Optimistic check only (no DB hit) — safe to call from proxy.ts.
export async function hasSessionCookie() {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);
  return Boolean(session?.userId);
}

// Secure check: always re-reads the role from the database so permission
// changes take effect immediately, and redirects unauthenticated requests.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);
  if (!session?.userId) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
});

// Same as getCurrentUser but returns null instead of redirecting, for
// places (like the login page itself) that need to know without forcing
// a redirect loop.
export const getCurrentUserOrNull = cache(
  async (): Promise<CurrentUser | null> => {
    const cookie = await getSessionCookie();
    const session = await decrypt(cookie);
    if (!session?.userId) return null;

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    return user ?? null;
  }
);

export function requireRole(user: CurrentUser, ...roles: Role[]) {
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden: insufficient permissions");
  }
}

export const canEditStock = (role: Role) =>
  role === "FULFILLMENT" || role === "ADMIN";

// Camille, Mary, and Emilie can all create exceptions and edit any field on
// one, including moving the stage directly — Mary logs reship/damaged/address
// issues for Camille to act on, Camille logs OOS issues for Mary to reach out
// on, so the split by role stopped making sense. "Confirmed resolved" is the
// one action that stays admin-only (see canConfirmResolved).
export const canEditException = (_role: Role) => true; // eslint-disable-line @typescript-eslint/no-unused-vars

export const canCreateException = canEditException;

export const canConfirmResolved = (role: Role) => role === "ADMIN";
