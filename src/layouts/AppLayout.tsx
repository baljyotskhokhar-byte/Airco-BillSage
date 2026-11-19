import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Drawer } from "vaul";
import {
  BarChart3,
  Building2,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserPlus,
  X,
} from "lucide-react";
import { useAppContext } from "@/app/providers";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "@/components/navigation/CommandPalette";
import { NotificationsPopover } from "@/components/navigation/NotificationsPopover";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bills", label: "Bills", icon: FileText },
  { to: "/vendors", label: "Vendors", icon: Building2 },
  { to: "/bank-account", label: "Bank Account", icon: CreditCard },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppLayout() {
  const { user, logout } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const initials = React.useMemo(() => {
    const name = user?.fullName || "Arjun Deshmukh";
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-[var(--border-default)] bg-[var(--bg-surface)]/95 backdrop-blur-[4px]">
        <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link to="/dashboard" className="inline-flex items-center">
              <BrandLogo />
            </Link>
          </div>

          {/* Center: Primary Navigation Links */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1 h-full">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex h-full items-center px-3.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors",
                    isActive
                      ? "text-[var(--brand-navy)] font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--brand-burgundy)]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-3.5 right-3.5 h-[2.5px] bg-[var(--brand-burgundy)] rounded-t-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: Command Palette, Notifications, Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              aria-label="Search and commands"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 sm:px-3 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Search</span>
              <kbd className="hidden lg:inline-flex items-center rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono-data text-[10px] text-[var(--text-muted)]">
                ⌘K
              </kbd>
            </button>

            <NotificationsPopover />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1 pl-1 pr-2 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.avatarUrl} alt={user?.fullName || "User"} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline max-w-[120px] truncate text-[12px] font-medium text-[var(--text-primary)]">
                    {user?.fullName || "Arjun Deshmukh"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {user?.fullName || "Arjun Deshmukh"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)] truncate">
                      {user?.email || "arjun.deshmukh@aircoenterprises.in"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/settings")}>
                  <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
                  Profile &amp; Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/signup")}>
                  <UserPlus className="h-4 w-4 text-[var(--text-secondary)]" />
                  Create account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleSignOut}
                  className="text-[var(--status-danger)] focus:bg-[var(--status-danger-bg)] focus:text-[var(--status-danger)]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Mobile Navigation Drawer (Vaul) */}
      <Drawer.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} direction="left">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 top-0 z-50 flex w-[280px] flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)] p-5 outline-none">
            <Drawer.Title className="sr-only">Navigation menu</Drawer.Title>
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
              <BrandLogo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="mt-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors",
                        isActive
                          ? "bg-[var(--brand-burgundy-bg)] text-[var(--brand-burgundy)]"
                          : "text-[var(--text-charcoal)] hover:bg-[var(--bg-elevated)]"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              <NavLink
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors",
                    isActive
                      ? "bg-[var(--brand-burgundy-bg)] text-[var(--brand-burgundy)]"
                      : "text-[var(--text-charcoal)] hover:bg-[var(--bg-elevated)]"
                  )
                }
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Settings</span>
              </NavLink>
            </nav>
            <div className="mt-auto border-t border-[var(--border-subtle)] pt-4">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
