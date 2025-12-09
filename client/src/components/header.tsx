import { useAuth, useLogout } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import { 
  Bot, 
  Search, 
  Bell,
  Zap
} from "lucide-react";

export function Header() {
  const { agent } = useAuth();
  const { config: whitelabelConfig } = useWhitelabelContext();

  // Fetch unread notifications count
  const { data: notificationCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30000,
  });

  return (
    <header className="bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-200/50 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="flex items-center justify-between px-6 h-full">
        {/* Left: Logo & Branding */}
        <div className="flex items-center space-x-3 min-w-0">
          {whitelabelConfig?.logoUrl ? (
            <img
              src={whitelabelConfig.logoUrl}
              alt={whitelabelConfig.companyName || "Logo"}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
              style={{ 
                backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6',
                boxShadow: `0 4px 12px ${whitelabelConfig?.primaryColor || '#3b82f6'}33`
              }}
            >
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="hidden sm:block min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">
              {whitelabelConfig?.companyName || "SupportHub"}
            </h1>
            <p className="text-xs text-gray-500">Agent Portal</p>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="w-full flex items-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
            <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <Input
              type="text"
              placeholder="Search tickets, customers..."
              className="bg-transparent border-0 p-0 text-sm focus:ring-0 shadow-none placeholder:text-gray-400 w-full"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* System Status */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Online</span>
          </div>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative h-9 w-9 rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {notificationCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 w-5 h-5 p-0 text-xs flex items-center justify-center bg-red-500 border-2 border-white shadow-sm">
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Button>

          {/* Agent Profile Badge */}
          <div className="h-9 px-3 flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all duration-200 cursor-pointer">
            {agent?.avatar ? (
              <img
                src={agent.avatar}
                alt="Agent"
                className="w-7 h-7 rounded-md object-cover"
              />
            ) : (
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-white">
                  {agent?.name?.charAt(0) || "A"}
                </span>
              </div>
            )}
            <span className="hidden sm:inline text-sm font-medium text-gray-700">
              {agent?.name?.split(' ')[0] || "Agent"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
