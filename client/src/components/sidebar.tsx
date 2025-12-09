import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { TicketWithAgent } from "@shared/schema";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import { 
  LayoutDashboard,
  Ticket,
  User,
  MessageCircle,
  FileText,
  BarChart3,
  ChevronDown,
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useLogout } from "@/lib/auth";
import { useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const { config: whitelabelConfig } = useWhitelabelContext();
  const { agent } = useAuth();
  const logout = useLogout();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { data: tickets } = useQuery<TicketWithAgent[]>({
    queryKey: ["/api/agent/tickets"]
  });

  const totalTickets = tickets?.length || 0;
  const myTickets = tickets?.filter(t => t.assignedAgentId).length || 0;
  const openTickets = tickets?.filter(t => t.status === 'open').length || 0;

  const mainNavItems = [
    {
      label: "Dashboard",
      href: "/agents",
      icon: LayoutDashboard,
      active: location === "/agents" || location === "/agents/dashboard",
    },
    {
      label: "All Tickets", 
      href: "/agents/tickets",
      icon: Ticket,
      badge: totalTickets,
      active: location === "/agents/tickets",
    },
    {
      label: "My Tickets",
      href: "/agents/my-tickets", 
      icon: User,
      badge: myTickets,
      active: location === "/agents/my-tickets",
    },
    {
      label: "Live Chat",
      href: "/agents/chat",
      icon: MessageCircle,
      active: location === "/agents/chat",
    },
  ];

  const secondaryNavItems = [
    { label: "Templates", href: "/agents/templates", icon: FileText },
    { label: "Reports", href: "/agents/reports", icon: BarChart3 },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-16 bottom-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 overflow-y-auto transition-all duration-300",
      isExpanded ? "w-72" : "w-20"
    )}>
      <div className="flex flex-col h-full">
        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {/* Primary Navigation Section */}
          <div className="space-y-2">
            <div className={cn("px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider", !isExpanded && "hidden")}>
              Navigation
            </div>
            {mainNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a 
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
                    item.active 
                      ? "text-white shadow-lg" 
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  )}
                  style={item.active ? {
                    backgroundColor: `${whitelabelConfig?.primaryColor || '#3b82f6'}`,
                    boxShadow: `0 4px 12px ${whitelabelConfig?.primaryColor || '#3b82f6'}40`
                  } : {}}
                  title={!isExpanded ? item.label : ""}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && (
                    <>
                      <span className="flex-1 font-medium text-sm">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge 
                          className={cn(
                            "ml-auto text-xs px-2 py-1",
                            item.active 
                              ? "bg-white/20 text-white" 
                              : "bg-slate-700 text-slate-200"
                          )}
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </a>
              </Link>
            ))}
          </div>

          {/* Secondary Navigation Section */}
          {isExpanded && (
            <>
              <div className="pt-6 pb-2">
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tools
                </div>
              </div>
              <div className="space-y-2">
                {secondaryNavItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200",
                        location === item.href 
                          ? "text-white bg-slate-700/70" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </a>
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer Section */}
        <div className="border-t border-slate-700/50 p-3 space-y-2">
          {/* Agent Profile */}
          {isExpanded && (
            <Link href="/agents/profile">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 transition-all duration-200 group">
                {agent?.avatar ? (
                  <img
                    src={agent.avatar}
                    alt="Agent"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white">
                      {agent?.name?.charAt(0) || "A"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{agent?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{agent?.email}</p>
                </div>
              </a>
            </Link>
          )}

          {/* Settings & Logout */}
          <div className="flex gap-2">
            <Link href="/agents/profile">
              <a 
                className={cn(
                  "flex items-center justify-center px-4 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200",
                  !isExpanded && "flex-1"
                )}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
                {isExpanded && <span className="ml-2 text-sm">Settings</span>}
              </a>
            </Link>
            <button 
              onClick={logout}
              className={cn(
                "flex items-center justify-center px-4 py-2.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200",
                !isExpanded && "flex-1"
              )}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              {isExpanded && <span className="ml-2 text-sm">Logout</span>}
            </button>
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-all duration-200"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", !isExpanded && "-rotate-90")} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
    </aside>
  );
}

export default Sidebar;
