"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PomodoroProvider } from "@/components/pomodoro/PomodoroProvider";
import { PomodoroWidget } from "@/components/pomodoro/PomodoroWidget";
import { QuickCapture } from "@/components/shared/QuickCapture";
import {
  LayoutDashboard,
  ListChecks,
  CheckSquare,
  FolderKanban,
  Wallet,
  StickyNote,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Ana Sayfa", icon: LayoutDashboard },
  { href: "/routines", label: "Rutinler", icon: ListChecks },
  { href: "/tasks", label: "Görevler", icon: CheckSquare },
  { href: "/projects", label: "Projeler", icon: FolderKanban },
  { href: "/finance", label: "Finans", icon: Wallet },
  { href: "/notes", label: "Notlar", icon: StickyNote },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <PomodoroProvider>
    <div className="flex min-h-screen">
      {/* Masaüstü kenar çubuğu */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-card p-4">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-bold">Life OS</h1>
          <p className="truncate text-xs text-muted-foreground">Kişisel asistan</p>
        </div>
        <NavLinks />
        <div className="mt-auto pt-4">
          <ThemeToggle />
          <Button variant="ghost" className="mt-1 w-full justify-start" onClick={logout}>
            <LogOut className="size-5" />
            Çıkış Yap
          </Button>
        </div>
      </aside>

      {/* Mobil çekmece */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col border-r bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between px-2">
              <div>
                <h1 className="text-lg font-bold">Life OS</h1>
                <p className="truncate text-xs text-muted-foreground">Kişisel asistan</p>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Kapat">
                <X className="size-5" />
              </button>
            </div>
            <NavLinks />
            <div className="mt-auto pt-4">
              <ThemeToggle />
              <Button variant="ghost" className="mt-1 w-full justify-start" onClick={logout}>
                <LogOut className="size-5" />
                Çıkış Yap
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Ana içerik */}
      <div className="flex flex-1 flex-col">
        {/* Mobil üst bar */}
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Menü">
            <Menu className="size-6" />
          </button>
          <span className="font-bold">Life OS</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">{children}</main>
      </div>

      <PomodoroWidget />
      <QuickCapture />
    </div>
    </PomodoroProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-5 dark:hidden" />
      <Moon className="size-5 hidden dark:block" />
      Tema
    </Button>
  );
}
