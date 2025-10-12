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
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {whitelabelConfig?.logoUrl ? (
              <img
                src={whitelabelConfig.logoUrl}
                alt={whitelabelConfig.companyName || "Logo"}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6' }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <h1 className="text-xl font-medium text-gray-900">
              {whitelabelConfig?.companyName || "SupportHub"}
            </h1>
          </div>
          <div className="hidden md:flex items-center space-x-2 ml-8">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">All systems operational</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2 w-64">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <Input
              type="text"
              placeholder="Search tickets..."
              className="bg-transparent border-0 p-0 text-sm focus:ring-0 shadow-none"
            />
          </div>
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Button>
          
          {/* Agent Profile */}
          <div className="flex items-center space-x-3">
            {agent?.avatar ? (
              <img
                src={agent.avatar}
                alt="Agent profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {agent?.name?.charAt(0) || "A"}
                </span>
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">{agent?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{agent?.role?.replace('_', ' ')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              className="text-gray-400 hover:text-gray-600"
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
