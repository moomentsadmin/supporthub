import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import {
  LayoutDashboard,
  Ticket,
  User,
  MessageCircle,
  FileText,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useLogout } from "@/lib/auth";
import { useState } from "react";
import type { TicketWithAgent } from "@shared/schema";

const MAIN_NAV = [
  { label: "Dashboard", href: "/agents", icon: LayoutDashboard, matchExact: true },
  { label: "All Tickets", href: "/agents/tickets", icon: Ticket, badge: "totalTickets" },
  { label: "My Tickets", href: "/agents/my-tickets", icon: User, badge: "myTickets" },
  { label: "Live Chat", href: "/agents/chat", icon: MessageCircle },
];

const TOOL_NAV = [
  { label: "Templates", href: "/agents/templates", icon: FileText },
  { label: "Reports",   href: "/agents/reports",   icon: BarChart3 },
];

export function Sidebar() {
  const [location] = useLocation();
  const { config: wl } = useWhitelabelContext();
  const { agent } = useAuth();
  const logoutMutation = useLogout();
  const [collapsed, setCollapsed] = useState(false);

  const { data: tickets } = useQuery<TicketWithAgent[]>({ queryKey: ["/api/agent/tickets"] });

  const badges = {
    totalTickets: tickets?.length || 0,
    myTickets: tickets?.filter(t => t.assignedAgentId).length || 0,
  };

  const isActive = (href: string, matchExact?: boolean) => {
    if (matchExact) return location === href || location === "/agents/dashboard";
    return location === href || location.startsWith(href + "/");
  };

  return (
    <aside
      className={cn(
        "sidebar-root flex flex-col h-screen flex-shrink-0 transition-all duration-300 z-30",
        collapsed ? "w-[68px]" : "w-[220px]"
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
            <Headphones className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight truncate">{wl?.companyName || "SupportHub"}</p>
            <p className="text-[10px] text-sidebar-text leading-tight">Agent Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && <p className="sidebar-section-label">Navigation</p>}
        {MAIN_NAV.map(item => {
          const active = isActive(item.href, item.matchExact);
          const badgeCount = item.badge ? badges[item.badge as keyof typeof badges] : 0;
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn("sidebar-link", active && "active")}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-sidebar-bg-hover text-sidebar-text"
                      )}>
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </>
                )}
              </a>
            </Link>
          );
        })}

        {!collapsed && <p className="sidebar-section-label mt-3">Tools</p>}
        {collapsed && <div className="h-2" />}
        {TOOL_NAV.map(item => {
          const active = isActive(item.href);
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
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && (
          <Link href="/agents/profile">
            <a className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sidebar-bg-hover transition-colors cursor-pointer">
              {agent?.avatar ? (
                <img src={agent.avatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-white">{agent?.name?.charAt(0)?.toUpperCase() || "A"}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white truncate">{agent?.name}</p>
                <p className="text-[10px] text-sidebar-text truncate">{agent?.email}</p>
              </div>
            </a>
          </Link>
        )}

        <button
          onClick={() => logoutMutation.mutate()}
          className={cn(
            "sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("sidebar-link w-full", collapsed && "justify-center")}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
