import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Banknote, LayoutDashboard, Users, FileText, LogOut, Menu, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/loans", label: "Loans", icon: FileText },
] as const;

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar (mobile) */}
      <header className="md:hidden sticky top-0 z-40 bg-primary text-primary-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gold text-gold-foreground grid place-items-center">
              <Banknote className="h-4 w-4" />
            </div>
            <span className="font-display font-semibold">MoWa Loans</span>
          </Link>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="p-2">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav className="px-4 pb-4 space-y-1">
            {navItems.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-sidebar-accent text-sm"
                activeProps={{ className: "bg-sidebar-accent" }}
              >
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-sidebar-accent text-sm"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        )}
      </header>

      <div className="md:flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground">
          <div className="px-6 py-6 flex items-center gap-3 border-b border-sidebar-border">
            <div className="h-10 w-10 rounded-lg bg-gold text-gold-foreground grid place-items-center">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg leading-none">MoWa Loans</div>
              <div className="text-xs text-sidebar-foreground/60 mt-1">Loan tracker</div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-sidebar-accent transition-colors"
                activeProps={{ className: "bg-sidebar-accent font-medium" }}
              >
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border space-y-3">

            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-sidebar-foreground/70">{user.email}</span>
              <button
                onClick={signOut}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground p-1"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className={cn("flex-1 md:pl-64")}>
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
