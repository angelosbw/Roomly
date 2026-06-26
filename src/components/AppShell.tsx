import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Calendar,CheckSquare,  DoorOpen, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const nav: {
  to: "/" | "/rooms" | "/bookings" | "/approvals";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  approverOnly?: boolean;
}[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/rooms", label: "Rooms", icon: DoorOpen },
  { to: "/bookings", label: "Bookings", icon: Calendar },
  { to: "/approvals", label: "Approvals", icon: CheckSquare, approverOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  if (!user) return null;
  const canApprove = user.role === "admin" || user.role === "office_manager";
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 border-b">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
              R
            </div>
            <div>
              <div className="font-semibold leading-none">Roomly</div>
              <div className="text-xs text-muted-foreground mt-1">Meeting rooms</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.filter((n) => !n.approverOnly || canApprove).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:font-medium"
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t text-xs text-muted-foreground">
          Tech test · JSON file storage
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-end gap-3 px-4 md:px-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
          <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
          <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-1.5">
            <LogOut className="size-4" /> Sign out
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
