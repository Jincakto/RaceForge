import { type AppNotification } from "../../../shared/data/data";
import { Btn, Card } from "../../../shared/ui/ui";

export function NotificationsPage({
  notifications,
  onMarkRead,
  onOpen,
}: {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onOpen: (n: AppNotification) => void;
}) {
  const icons: Record<string, string> = {
    health: "🏥",
    training: "🏇",
    race: "🏆",
    system: "⚙️",
    lock: "🔒",
    approval: "🐎",
    inventory: "📦",
    incident: "🚨",
  };
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-bold">Notifications</h2>
        <Btn
          variant="ghost"
          onClick={() => notifications.forEach((n) => onMarkRead(n.id))}
        >
          Mark all as read
        </Btn>
      </div>
      {notifications.length === 0 && (
        <Card className="p-10 text-center text-gray-400 text-sm">
          No notifications yet
        </Card>
      )}
      {notifications.map((n) => (
        <Card
          key={n.id}
          className={`p-4 cursor-pointer ${!n.read ? (n.type === "lock" ? "border-l-4 border-red-500" : "border-l-4 border-[#c9973b]") : ""}`}
          onClick={() => {
            onMarkRead(n.id);
            onOpen(n);
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">{icons[n.type]}</span>
            <div className="flex-1">
              <div
                className={`text-sm ${!n.read ? "font-semibold" : "text-gray-600"}`}
              >
                {n.message}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {n.time}
                {n.action ? " · Click to open" : ""}
              </div>
            </div>
            {!n.read && (
              <div className="w-2 h-2 rounded-full bg-[#c9973b] mt-2" />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function newNotif(
  n: Omit<AppNotification, "id" | "time" | "read">,
): AppNotification {
  return {
    ...n,
    id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    time: "Just now",
    read: false,
  };
}
