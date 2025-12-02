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
  LogOut
} from "lucide-react";

export function Header() {
  const { agent } = useAuth();
  const logout = useLogout();
  const { config: whitelabelConfig } = useWhitelabelContext();

  // Fetch unread notifications count
  const { data: notificationCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/80 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {whitelabelConfig?.logoUrl ? (
              <img
                src={whitelabelConfig.logoUrl}
                alt={whitelabelConfig.companyName || "Logo"}
                className="h-9 w-auto object-contain"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm hover-scale transition-all duration-200"
                style={{ 
                  backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6',
                  boxShadow: `0 4px 14px ${whitelabelConfig?.primaryColor || '#3b82f6'}33`
                }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
                {whitelabelConfig?.companyName || "SupportHub"}
              </h1>
              <p className="text-xs text-gray-500 font-medium">Agent Portal</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center space-x-2 ml-6 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-gentle"></div>
            <span className="text-xs font-medium text-green-700">All systems operational</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="hidden md:flex items-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 w-72 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <Input
              type="text"
              placeholder="Search tickets, customers..."
              className="bg-transparent border-0 p-0 text-sm focus:ring-0 shadow-none placeholder:text-gray-400"
            />
            <kbd className="hidden xl:inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded">
              ⌘K
            </kbd>
          </div>
          
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative hover-scale h-10 w-10 rounded-xl hover:bg-gray-100 transition-all duration-200"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs flex items-center justify-center bg-red-500 border-2 border-white shadow-sm">
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Button>
          
          {/* Agent Profile */}
          <div className="flex items-center space-x-3 pl-3 ml-2 border-l border-gray-200">
            {agent?.avatar ? (
              <img
                src={agent.avatar}
                alt="Agent profile"
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-gray-100 hover-scale cursor-pointer"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center ring-2 ring-gray-100 hover-scale cursor-pointer">
                <span className="text-sm font-semibold text-white">
                  {agent?.name?.charAt(0) || "A"}
                </span>
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-900">{agent?.name}</p>
              <p className="text-xs text-gray-500 font-medium capitalize">{agent?.role?.replace('_', ' ')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 h-9 w-9"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
