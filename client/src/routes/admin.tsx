import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Bot,
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  Menu,
  X,
  LogOut,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Dashboard — Helix" }] }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) throw redirect({ to: "/login" });
  },
  component: AdminLayout,
});

const nav = [
  {
    to: "/admin",
    adminLabel: "Tickets & KB",
    userLabel: "My Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  { to: "/admin/analytics", adminLabel: "Analytics", icon: BarChart3 },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{ name?: string; role?: string }>({});

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      navigate({ to: "/login", replace: true });
      return;
    }
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(u);
    } catch {
      localStorage.removeItem("user");
    }
    setAuthReady(true);
  }, [navigate]);

  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="app-shell helix-admin-shell flex min-h-screen w-full mesh-bg">
      {/* Sidebar */}
      <aside
        className={cn(
          "helix-admin-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar/88 text-sidebar-foreground shadow-xl shadow-primary/5 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="synapse-logo-mark" aria-hidden="true"><span /></span>
            <span className="helix-admin-brand">Helix</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ to, adminLabel, userLabel, icon: Icon, exact }) => {
            if (to === "/admin/analytics" && user.role !== "admin") return null;
            const active = isActive(to, exact);
            const label = user.role === "admin" ? adminLabel : userLabel || adminLabel;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    active && "text-primary",
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/chat"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <MessageSquare className="h-4 w-4" /> Open chat
          </Link>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="helix-admin-header sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background/72 px-4 shadow-sm backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold sm:text-base">
                {pathname === "/admin/analytics" ? "Analytics" : "Tickets & Knowledge Base"}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Intelligence for every conversation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user.name?.substring(0, 2).toUpperCase() || "AD"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-medium leading-tight">{user.name || "Admin User"}</p>
                    <p className="text-[11px] leading-tight text-muted-foreground capitalize">
                      {user.role || "Admin"}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    const refreshToken = localStorage.getItem("refreshToken");
                    if (refreshToken) {
                      await fetchApi("/auth/logout", {
                        method: "POST",
                        body: JSON.stringify({ refreshToken }),
                      }).catch(() => {});
                    }
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    localStorage.removeItem("user");
                    toast.success("Logged out");
                    navigate({ to: "/login" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="helix-admin-main flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
