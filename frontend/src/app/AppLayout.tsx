import { type AppUser, type Role, type AppNotification, getLifecycle } from "../shared/data/data";
import { useState } from "react";
import { type Page, type AppState } from "./appTypes";
import { FEATURES } from "../features/admin/admin";
import { Card } from "../shared/ui/ui";

export function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
      <span className="text-lg">✓</span>
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
}

export function ErrorToast({ message }: { message: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 max-w-md bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-start gap-3">
      <span className="text-lg leading-tight">⛔</span>
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
}

export function UserAvatarDropdown({
  user,
  onLogout,
}: {
  user: AppUser;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full bg-[#c9973b] flex items-center justify-center text-white text-sm font-bold hover:bg-[#b8852a] transition-all shadow-lg"
      >
        {user.avatar}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="font-semibold text-[#0f1729] text-sm truncate">
                {user.name}
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {user.email}
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all text-left"
            >
              → Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  manager: "Club Manager",
  head_trainer: "Trainer",
  veterinarian: "Veterinarian",
  groom: "Groom",
  owner: "Horse Owner",
};

export const NAV_ITEMS: Partial<
  Record<Role, { icon: string; label: string; page: Page; badge?: string }[]>
> = {
  admin: [
    { icon: "⊞", label: "Overview", page: "dashboard" },
    { icon: "👤", label: "Account management", page: "accounts" },
    { icon: "🛡", label: "Permissions", page: "permissions" },
    { icon: "📜", label: "Audit log", page: "audit-log" },
    { icon: "🔔", label: "Notifications", page: "notifications" },
  ],
  manager: [
    { icon: "⊞", label: "Dashboard", page: "dashboard" },
    { icon: "🐎", label: "Horses in the club", page: "horse-list" },
    {
      icon: "📋",
      label: "Horse intake",
      page: "center-requests",
      badge: "horseReqs",
    },
    { icon: "🏷", label: "Package catalogue", page: "package-catalog" },
    { icon: "🧑‍🏫", label: "Trainer assignments", page: "trainer-assign" },
    { icon: "👥", label: "Staff", page: "staff" },
    { icon: "📊", label: "Reports", page: "reports" },
    { icon: "🔔", label: "Notifications", page: "notifications" },
  ],
  head_trainer: [
    { icon: "⊞", label: "Dashboard", page: "dashboard" },
    { icon: "🐎", label: "Horses", page: "horse-list" },
    { icon: "📋", label: "Training & plans", page: "training-hub" },
    { icon: "🔔", label: "Notifications", page: "notifications" },
  ],
  veterinarian: [
    { icon: "⊞", label: "Dashboard", page: "dashboard" },
    { icon: "🐎", label: "Horses", page: "horse-list" },
    { icon: "🧑‍⚕️", label: "Assigned horses", page: "vet-assign" },
    { icon: "🏥", label: "Medical records", page: "health-records" },
    {
      icon: "📝",
      label: "Health examination",
      page: "vet-health-form",
      badge: "vetTodo",
    },
    { icon: "🔔", label: "Notifications", page: "notifications" },
  ],
  groom: [
    { icon: "⊞", label: "Dashboard", page: "dashboard" },
    { icon: "🌿", label: "Care & feeding", page: "care-hub" },
    { icon: "📦", label: "My inventory", page: "inventory" },
    { icon: "📜", label: "Inventory history", page: "inventory-log" },
    { icon: "🔔", label: "Notifications", page: "notifications" },
  ],
  owner: [
    { icon: "⊞", label: "Dashboard", page: "dashboard" },
    { icon: "🐎", label: "My horses", page: "my-horses" },
    { icon: "➕", label: "Register a new horse", page: "horse-create" },
    { icon: "🎯", label: "Training registration", page: "training-register" },
    { icon: "📈", label: "Performance", page: "performance" },
    { icon: "📜", label: "Certificates", page: "certificates" },
    { icon: "🔔", label: "Notifications", page: "notifications" },
  ],
};

export const DEFAULT_ROLE_PERMS: Record<string, string[]> = Object.fromEntries(
  (["manager", "head_trainer", "veterinarian", "groom", "owner"] as Role[]).map(
    (r) => [
      r,
      [
        ...(NAV_ITEMS[r] || []).map((i) => i.page as string),
        // "post-exam" no longer has its own sidebar item (it is part of "Health examination"),
        // but it stays a grantable permission for veterinarians.
        ...(r === "veterinarian" ? ["post-exam"] : []),
      ].filter((pg) => FEATURES.some((f) => f.page === pg)),
    ],
  ),
);

export const GRANTABLE_PAGES: { page: Page; label: string; icon: string }[] = [
  { page: "horse-list", label: "Horse list", icon: "🐎" },
  { page: "health-records", label: "Medical records", icon: "🏥" },
  { page: "vet-health-form", label: "Health examination", icon: "📝" },
  { page: "training-hub", label: "Training & plans", icon: "🏇" },
  { page: "care-hub", label: "Care & feeding", icon: "🌿" },
  { page: "performance", label: "Performance", icon: "📈" },
  { page: "reports", label: "Reports", icon: "📊" },
  { page: "center-requests", label: "Horse admission review", icon: "📋" },
  { page: "staff", label: "Staff", icon: "👥" },
];

export function visibleNotifications(
  all: AppNotification[],
  user: AppUser,
): AppNotification[] {
  return all.filter((n) => {
    if (n.clubId && n.clubId !== user.clubId) return false;
    if (
      user.role === "groom" &&
      ["training", "lock", "race", "plan", "session"].includes(n.type)
    )
      return false;
    if (!n.toRoles && !n.toUserIds) return true;
    return !!(
      n.toUserIds?.includes(user.id) ||
      (user.role && n.toRoles?.includes(user.role))
    );
  });
}

function Sidebar({
  user,
  page,
  navigate,
  memberReqCount,
  horseReqCount,
  vetTodoCount,
  grantedPages,
  rolePerms,
}: {
  user: AppUser;
  page: Page;
  navigate: (p: Page) => void;
  memberReqCount: number;
  horseReqCount: number;
  vetTodoCount: number;
  grantedPages: Page[];
  rolePerms: Record<string, string[]>;
}) {
  const isFeature = (pg: string) => FEATURES.some((f) => f.page === pg);
  const permitted = (pg: string) =>
    user.role === "admin" ||
    !isFeature(pg) ||
    (rolePerms[user.role!] || []).includes(pg);
  const matrixExtra = (rolePerms[user.role!] || [])
    .filter((pg) => pg !== "post-exam") // merged into "Health examination"
    .filter((pg) => !(NAV_ITEMS[user.role!] || []).some((i) => i.page === pg))
    .map((pg) => FEATURES.find((f) => f.page === pg)!)
    .filter(Boolean)
    .map((f) => ({ icon: f.icon, label: f.label, page: f.page as Page }));
  const roleItems = [
    ...(NAV_ITEMS[user.role!] || []).filter((i) => permitted(i.page)),
    ...matrixExtra,
  ];
  const rolePages = new Set(roleItems.map((i) => i.page));
  const extraItems = GRANTABLE_PAGES.filter(
    (g) => grantedPages.includes(g.page) && !rolePages.has(g.page),
  ).map((g) => ({ icon: g.icon, label: g.label, page: g.page }));
  const items = [...roleItems, ...extraItems];
  return (
    <div className="w-60 min-h-screen bg-[#0f1729] flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#c9973b] flex items-center justify-center text-white text-lg">
            🐎
          </div>
          <div>
            <div className="text-white font-serif font-bold text-base leading-tight">
              RaceForce
            </div>
            <div className="text-[#c9973b] text-xs">
              Horse Racing Management
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const badge =
            "badge" in item ? (item as { badge?: string }).badge : undefined;
          const bc =
            badge === "memberReqs"
              ? memberReqCount
              : badge === "horseReqs"
                ? horseReqCount
                : badge === "vetTodo"
                  ? vetTodoCount
                  : 0;
          const active =
            page === item.page ||
            (page === "post-exam" && item.page === "vet-health-form");
          return (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${active ? "bg-[#c9973b] text-white" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {bc > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {bc}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => navigate("profile")}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-[#c9973b] flex items-center justify-center text-white text-xs font-bold">
            {user.avatar}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-white text-sm font-medium truncate">
              {user.name}
            </div>
            <div className="text-gray-400 text-xs">
              {ROLE_LABELS[user.role!]}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export function AppLayout({
  user,
  page,
  title,
  navigate,
  children,
  state,
}: {
  user: AppUser;
  page: Page;
  title: string;
  navigate: (p: Page) => void;
  children: React.ReactNode;
  state: AppState;
}) {
  const unread = visibleNotifications(state.notifications, user).filter(
    (n) => !n.read,
  ).length;
  const myClub = state.clubs.find((c) => c.managerId === user.id);
  const pendingMembers = myClub
    ? state.memberRequests.filter(
        (r) => r.clubId === myClub.id && r.status === "pending",
      ).length
    : 0;
  const pendingHorses = myClub
    ? state.horseClubRequests.filter(
        (r) => r.clubId === myClub.id && r.status === "pending",
      ).length
    : 0;
  const grantedPages = state.userPermissions[user.id] || [];
  const clubHorses = state.horses.filter((h) => h.clubId === user.clubId);
  const vetTodoCount =
    user.role === "veterinarian"
      ? clubHorses.filter((h) =>
          ["awaiting_vet", "locked"].includes(getLifecycle(h)),
        ).length +
        state.trainingSessions.filter(
          (s) =>
            s.status === "Completed" &&
            !s.postExamDone &&
            clubHorses.some((h) => h.id === s.horseId),
        ).length
      : 0;
  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f7]">
      <Sidebar
        user={user}
        page={page}
        navigate={navigate}
        memberReqCount={pendingMembers}
        horseReqCount={pendingHorses}
        vetTodoCount={vetTodoCount}
        grantedPages={grantedPages}
        rolePerms={state.rolePerms}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="text-base font-semibold text-[#0f1729]">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("notifications")}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unread}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("profile")}
              className="w-8 h-8 rounded-full bg-[#1a2844] flex items-center justify-center text-white text-xs font-bold"
            >
              {user.avatar}
            </button>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export const PAGE_TITLES: Partial<Record<Page, string>> = {
  accounts: "Account management",
  permissions: "Permissions",
  "audit-log": "Audit log",
  dashboard: "Overview",
  "horse-list": "Horses in the club",
  "horse-detail": "Horse details",
  "horse-create": "Register a new horse",
  "horse-edit": "Edit horse",
  "my-horses": "My horses",
  "center-requests": "Horse intake",
  "package-catalog": "Training package catalogue",
  "trainer-assign": "Trainer assignments",
  "trainer-profile": "Candidate profile",
  "health-records": "Medical records",
  "vet-health-form": "Health examination",
  "training-hub": "Training & plans",
  "care-hub": "Care & feeding",
  performance: "Performance",
  reports: "Reports",
  staff: "Staff",
  notifications: "Notifications",
  profile: "Profile",
  "training-register": "Training registration",
  certificates: "Certificates",
  "vet-assign": "Assigned horses",
  "post-exam": "Health examination",
  inventory: "My inventory",
  "inventory-log": "Inventory history",
};

export function NoAccess({ text }: { text: string }) {
  return (
    <Card className="p-10 text-center max-w-md">
      <div className="text-4xl mb-3">🔒</div>
      <div className="font-semibold text-gray-600">{text}</div>
    </Card>
  );
}
