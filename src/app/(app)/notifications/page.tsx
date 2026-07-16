import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { markAllNotificationsRead, markNotificationReadAndGo } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Notifications</h1>
          <p className="text-sm text-zinc-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {notifications.length === 0 && (
          <li className="p-6 text-center text-sm text-zinc-400">No notifications yet.</li>
        )}
        {notifications.map((notification) => (
          <li key={notification.id}>
            <form action={markNotificationReadAndGo}>
              <input type="hidden" name="notificationId" value={notification.id} />
              <button
                type="submit"
                className={`flex w-full items-start justify-between gap-3 p-4 text-left text-sm hover:bg-zinc-50 ${
                  notification.readAt ? "text-zinc-500" : "font-medium text-zinc-900"
                }`}
              >
                <span>
                  {!notification.readAt && (
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-600" aria-hidden />
                  )}
                  {notification.message}
                </span>
                <span className="whitespace-nowrap text-xs text-zinc-400">
                  {notification.createdAt.toLocaleString()}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
