import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/constants";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

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
