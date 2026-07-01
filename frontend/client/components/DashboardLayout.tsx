import { ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle,
  X,
} from "lucide-react";
import { notificationsApi } from "@/services/api/notifications";
import { useAuth } from "@/context/AuthContext";
import type { NotificationResponse } from "@/types/api";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  badge?: number;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  currentPath: string;
}

const roleLabels: Record<string, string> = {
  citizen: "Citizen",
  responder: "Responder",
  dispatcher: "Dispatcher",
  admin: "Admin",
  guest: "Guest",
};

const roleDescriptions: Record<string, string> = {
  citizen: "Request help and track updates",
  responder: "Handle assignments and routes",
  dispatcher: "Coordinate incidents and teams",
  admin: "Review people and activity",
  guest: "SafeCommunity workspace",
};

export default function DashboardLayout({ children, navItems, currentPath }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<number[]>([]);

  const userEmail = sessionStorage.getItem("userEmail") ?? "Not signed in";
  const userName = sessionStorage.getItem("userName") ?? "SafeCommunity";
  const userRole = sessionStorage.getItem("userRole") ?? "guest";
  const initials = initialsFor(userName);
  const currentItem = useMemo(() => findCurrentItem(navItems, currentPath), [navItems, currentPath]);

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const notificationList = notifications.data ?? [];
  const unreadCount = notificationList.filter((item) => !item.read && !seenIds.includes(item.id)).length;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} aria-label="Close sidebar" />
          <aside className="relative flex h-full w-[min(22rem,88vw)] flex-col border-r border-slate-200 bg-white shadow-xl">
            <SidebarContent
              navItems={navItems}
              currentPath={currentPath}
              userEmail={userEmail}
              userName={userName}
              userRole={userRole}
              initials={initials}
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
              mobile
            />
          </aside>
        </div>
      ) : null}

      <aside className="hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col">
        <SidebarContent
          navItems={navItems}
          currentPath={currentPath}
          userEmail={userEmail}
          userName={userName}
          userRole={userRole}
          initials={initials}
          onLogout={handleLogout}
          onNavigate={() => undefined}
        />
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden" aria-label="Open sidebar">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>{roleLabels[userRole] ?? "Workspace"}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                  <span className="hidden sm:inline">{roleDescriptions[userRole] ?? "SafeCommunity workspace"}</span>
                </div>
                <h1 className="truncate text-base font-bold text-slate-950 sm:text-lg">{currentItem?.label ?? "Dashboard"}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              
              <button onClick={() => notifications.refetch()} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100" aria-label="Refresh notifications">
                <RefreshCw className={`h-5 w-5 ${notifications.isFetching ? "animate-spin" : ""}`} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{unreadCount}</span> : null}
                </button>
                {notificationsOpen ? (
                  <NotificationPanel
                    notifications={notificationList}
                    loading={notifications.isLoading}
                    fetching={notifications.isFetching}
                    unreadCount={unreadCount}
                    onRefresh={() => notifications.refetch()}
                    onClose={() => setNotificationsOpen(false)}
                    onMarkSeen={() => setSeenIds(notificationList.map((item) => item.id))}
                    seenIds={seenIds}
                  />
                ) : null}
              </div>
              <button onClick={handleLogout} className="hidden rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-red-600 sm:block" aria-label="Logout">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </main>
    </div>
  );
}

function SidebarContent({ navItems, currentPath, userEmail, userName, userRole, initials, onLogout, onNavigate, onClose, mobile = false }: {
  navItems: NavItem[];
  currentPath: string;
  userEmail: string;
  userName: string;
  userRole: string;
  initials: string;
  onLogout: () => void;
  onNavigate: () => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  return (
    <>
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-600 shadow-sm">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-lg font-bold tracking-tight text-slate-950">SafeCommunity</span>
              <span className="block truncate text-xs font-semibold uppercase tracking-wide text-red-600">{roleLabels[userRole] ?? userRole}</span>
            </div>
          </Link>
          {mobile ? <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close sidebar"><X className="h-5 w-5" /></button> : null}
        </div>
      </div>

      <div className="border-b border-slate-200 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            Signed in and protected
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <Link to="/" onClick={onNavigate} className="mb-2 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950">
          <Home className="h-5 w-5 text-slate-500" />
          Public home
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4 pt-2">
        {navItems.map((item) => {
          const isActive = isActivePath(currentPath, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm transition ${
                isActive ? "bg-red-50 text-red-800 ring-1 ring-red-100" : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={isActive ? "text-red-700" : "text-slate-500"}>{item.icon}</span>
                <span className="truncate font-semibold">{item.label}</span>
              </span>
              <span className="flex items-center gap-2">
                {item.badge ? <span className="min-w-6 rounded-full bg-red-600 px-2 py-0.5 text-center text-xs font-bold text-white">{item.badge}</span> : null}
                {isActive ? <ChevronRight className="h-4 w-4" /> : null}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

function NotificationPanel({ notifications, loading, fetching, unreadCount, onRefresh, onClose, onMarkSeen, seenIds }: {
  notifications: NotificationResponse[];
  loading: boolean;
  fetching: boolean;
  unreadCount: number;
  onRefresh: () => void;
  onClose: () => void;
  onMarkSeen: () => void;
  seenIds: number[];
}) {
  return (
    <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="font-bold text-slate-950">Notifications</h2>
          <p className="text-sm text-slate-500">{unreadCount > 0 ? `${unreadCount} new update${unreadCount === 1 ? "" : "s"}` : "You are all caught up"}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close notifications">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <button onClick={onRefresh} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950">
          <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <button onClick={onMarkSeen} className="text-sm font-semibold text-red-600 hover:text-red-700">Mark seen</button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? <PanelState icon={<RefreshCw className="h-6 w-6 animate-spin" />} title="Loading updates" text="Checking for new activity." /> : null}
        {!loading && notifications.length === 0 ? <PanelState icon={<Search className="h-6 w-6" />} title="No notifications yet" text="New assignments, alerts, and updates will appear here." /> : null}
        {!loading && notifications.map((notification) => {
          const isUnread = !notification.read && !seenIds.includes(notification.id);
          return <NotificationRow key={notification.id} notification={notification} unread={isUnread} />;
        })}
      </div>
    </div>
  );
}

function NotificationRow({ notification, unread }: { notification: NotificationResponse; unread: boolean }) {
  return (
    <div className={`border-b border-slate-100 p-4 last:border-b-0 ${unread ? "bg-red-50/60" : "bg-white"}`}>
      <div className="flex gap-3">
        <div className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${unread ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500"}`}>
          {unread ? <Bell className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-slate-950">{notification.title}</p>
            {unread ? <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-red-600" /> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500"><Clock className="h-3.5 w-3.5" />{new Date(notification.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function PanelState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="p-8 text-center text-slate-500"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">{icon}</div><p className="font-bold text-slate-950">{title}</p><p className="mt-1 text-sm">{text}</p></div>;
}

function isActivePath(currentPath: string, itemPath: string) {
  if (currentPath === itemPath) return true;
  if (itemPath.split("/").length <= 3) return false;
  return currentPath.startsWith(`${itemPath}/`);
}

function findCurrentItem(navItems: NavItem[], currentPath: string) {
  return navItems.find((item) => isActivePath(currentPath, item.path)) ?? navItems[0];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SC";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
