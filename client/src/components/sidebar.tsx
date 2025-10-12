import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { TicketWithAgent } from "@shared/schema";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import { 
  LayoutDashboard,
  Ticket,
  User,
  Mail,
  MessageCircle,
  AtSign,
  Facebook,
  Users,
  FileText,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { config: whitelabelConfig } = useWhitelabelContext();
  
  const { data: tickets } = useQuery<TicketWithAgent[]>({
    queryKey: ["/api/agent/tickets"]
  });

  const totalTickets = tickets?.length || 0;
  const myTickets = tickets?.filter(t => t.assignedAgentId).length || 0;

  const navigationItems = [
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

  // Channel configuration moved to admin area

  const managementItems = [
    { label: "Templates", href: "/agents/templates", icon: FileText },
    { label: "Reports", href: "/agents/reports", icon: BarChart3 },
    { label: "Profile", href: "/agents/profile", icon: User },
  ];

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a 
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  item.active 
                    ? "font-medium" 
                    : "text-gray-700 hover:bg-gray-50"
                )}
                style={item.active ? {
                  backgroundColor: `${whitelabelConfig?.primaryColor || '#3b82f6'}20`,
                  color: whitelabelConfig?.primaryColor || '#3b82f6'
                } : {}}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant={item.active ? "default" : "secondary"}
                    className="ml-auto text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </a>
            </Link>
          ))}
        </div>

        {/* Channel configuration moved to admin area */}

        {/* Management Section */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Management
          </h3>
          <div className="space-y-1">
            {managementItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </a>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
