import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/constants";
import { logout } from "@/app/actions/auth";

// Forces this whole segment to render fresh on every navigation (not just
// hard reloads) so the unread notification count never goes stale.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const unreadCount = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/exceptions", label: "Exceptions" },
    { href: "/stock", label: "Stock log" },
    { href: "/archive", label: "Archive" },
    ...(user.role === "ADMIN" ? [{ href: "/users", label: "Users" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-zinc-900">
              lil sweet treat
              <span className="ml-1.5 font-normal text-zinc-400">
                fulfillment tracker
              </span>
            </span>
            <nav className="flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="relative text-zinc-500 hover:text-zinc-900"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .74-.29 1.45-.8 1.98L4 14.5c-1 1-.3 2.5 1 2.5h14c1.3 0 2-1.5 1-2.5l-1.2-1.43a2.83 2.83 0 0 1-.8-1.98V8a6 6 0 0 0-6-6Z" />
                <path d="M9.5 19a2.5 2.5 0 0 0 5 0Z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/account" className="text-sm text-zinc-500 hover:text-zinc-900">
              {user.name}{" "}
              <span className="text-zinc-400">
                ({ROLE_LABELS[user.role]})
              </span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
