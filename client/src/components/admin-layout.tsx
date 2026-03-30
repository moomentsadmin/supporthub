import { ReactNode, useState } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  ShieldCheck,
  MessageSquare,
  BookOpen,
  Palette,
  Settings,
  FileText,
  Upload,
  Monitor,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, match: ["/admin", "/admin/dashboard"] },
      { label: "Analytics",  href: "/admin/analytics",  icon: TrendingUp },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Agents",      href: "/admin/agents",      icon: Users },
      { label: "Admin Users", href: "/admin/admin-users", icon: ShieldCheck },
      { label: "Channels",    href: "/admin/channels",    icon: MessageSquare },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Knowledge Base",    href: "/admin/knowledge-base", icon: BookOpen },
      { label: "Branding",          href: "/admin/branding",       icon: Palette },
      { label: "Widget Integration",href: "/admin/widget",         icon: Monitor },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings",     href: "/admin/settings",          icon: Settings },
      { label: "System Logs",  href: "/admin/logs",              icon: FileText },
      { label: "Import Data",  href: "/admin/freshdesk-import",  icon: Upload },
    ],
  },
];

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { adminUser, logout } = useAdminAuth();
  const { config: wl } = useWhitelabelContext();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!adminUser) return null;

  const isActive = (item: { href: string; match?: string[] }) => {
    if (item.match) return item.match.some(p => location === p);
    return location === item.href || location.startsWith(item.href + "/");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "sidebar-root flex flex-col h-screen transition-all duration-300 z-30 flex-shrink-0",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-14 px-3 border-b border-sidebar-border", collapsed ? "justify-center" : "gap-3")}>
          {wl?.logoUrl ? (
            <img src={wl.logoUrl} alt={wl.companyName || "Logo"} className={cn("object-contain", collapsed ? "h-7 w-7" : "h-7 w-auto")} />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: wl?.primaryColor || "hsl(220 80% 54%)" }}
            >
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white leading-tight truncate">{wl?.companyName || "SupportHub"}</p>
              <p className="text-[10px] text-sidebar-text leading-tight">Admin Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="sidebar-section-label">{section.label}</p>
              )}
              {section.items.map(item => {
                const active = isActive(item);
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={cn("sidebar-link", active && "active")}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </a>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          {/* User info */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-brand-gradient flex items-center justify-center flex-shrink-0 bg-blue-600">
                <span className="text-xs font-semibold text-white">{adminUser.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{adminUser.name}</p>
                <p className="text-[10px] text-sidebar-text truncate">{adminUser.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => logout()}
            className={cn(
              "sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10",
              collapsed && "justify-center"
            )}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn("sidebar-link w-full", collapsed && "justify-center")}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center px-6 border-b border-border bg-card flex-shrink-0 gap-3">
          {title && (
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">{adminUser.email}</span>
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-semibold text-white">{adminUser.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}