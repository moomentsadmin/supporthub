import { ReactNode } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import { Button } from "@/components/ui/button";
import { 
  Shield,
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Settings,
  FileText,
  Upload,
  Monitor,
  LogOut,
  BookOpen
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { adminUser, logout } = useAdminAuth();
  const { config: whitelabelConfig } = useWhitelabelContext();
  const [location] = useLocation();

  if (!adminUser) {
    return null;
  }

  const isActive = (path: string) => {
    return location === path || location.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex h-screen relative z-10">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {whitelabelConfig?.logoUrl ? (
                <img
                  src={whitelabelConfig.logoUrl}
                  alt={whitelabelConfig.companyName || "Logo"}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <Shield 
                  className="w-8 h-8" 
                  style={{ color: whitelabelConfig?.primaryColor || '#3b82f6' }}
                />
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-600">System Management</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            <Link href="/admin/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/dashboard') || location === '/admin' 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <BarChart3 className="h-5 w-5" />
              Dashboard
            </Link>
            <Link href="/admin/analytics" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/analytics') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <TrendingUp className="h-5 w-5" />
              Analytics
            </Link>
            <Link href="/admin/agents" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/agents') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <Users className="h-5 w-5" />
              Agents
            </Link>
            <Link href="/admin/admin-users" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/admin-users') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <Shield className="h-5 w-5" />
              Admin Users
            </Link>
            <Link href="/admin/channels" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/channels') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <MessageSquare className="h-5 w-5" />
              Channels
            </Link>
            <Link href="/admin/knowledge-base" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/knowledge-base') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <BookOpen className="h-5 w-5" />
              Knowledge Base
            </Link>
            <Link href="/admin/settings" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/settings') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <Link href="/admin/logs" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/logs') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <FileText className="h-5 w-5" />
              System Logs
            </Link>
            <Link href="/admin/freshdesk-import" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/freshdesk-import') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <Upload className="h-5 w-5" />
              Import Data
            </Link>
            <Link href="/admin/widget" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive('/admin/widget') 
                ? 'text-gray-900 bg-blue-100' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}>
              <Monitor className="h-5 w-5" />
              Widget Integration
            </Link>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Shield className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{adminUser.name}</p>
                <p className="text-xs text-gray-600">{adminUser.role}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => logout()}
              className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {title && (
            <div className="bg-white border-b border-gray-200 px-8 py-6">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            </div>
          )}
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}