import { useQuery } from "@tanstack/react-query";
import type { WhitelabelConfig } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAuth } from "@/lib/admin-auth";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import { 
  Users, 
  Tickets, 
  Settings, 
  LogOut, 
  UserPlus, 
  Palette,
  Shield,
  BarChart3,
  MessageSquare,
  Monitor,
  Wifi,
  FileText,
  Upload,
  Edit3
} from "lucide-react";
import { Link } from "wouter";

interface AdminDashboardStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  totalAgents: number;
  activeAgents: number;
  totalAdmins: number;
  activeChatSessions: number;
  recentTickets: any[];
}

interface AdminAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { adminUser, logout } = useAdminAuth();
  const { config: whitelabelConfig } = useWhitelabelContext();

  const { data: stats } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"]
  });

  const { data: agents } = useQuery<AdminAgent[]>({
    queryKey: ["/api/admin/agents"]
  });

  const { data: adminWhitelabelConfig } = useQuery<WhitelabelConfig | null>({
    queryKey: ["/api/admin/whitelabel"]
  });

  if (!adminUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 relative z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {whitelabelConfig?.companyName ? `${whitelabelConfig.companyName} Admin` : "Admin Portal"}
                </h1>
              </div>
              <Badge variant="secondary">
                {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {adminUser.name}
              </span>
              <Button variant="secondary" onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 relative z-10">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.totalTickets || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Tickets className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Agents</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.activeAgents || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.openTickets || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Live Chats</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.activeChatSessions || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Modern Tab Layout */}
        <Tabs defaultValue="agents" className="space-y-6">
          <div className="bg-white border rounded-lg p-1">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 bg-gray-50 gap-1">
              <TabsTrigger value="agents" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <Users className="w-4 h-4 mr-2" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="admin-users" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <Shield className="w-4 h-4 mr-2" />
                Admins
              </TabsTrigger>
              <TabsTrigger value="channels" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <MessageSquare className="w-4 h-4 mr-2" />
                Channels
              </TabsTrigger>
              <TabsTrigger value="widget" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <Monitor className="w-4 h-4 mr-2" />
                Widget
              </TabsTrigger>
              <TabsTrigger value="whitelabel" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <Palette className="w-4 h-4 mr-2" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="logs" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <FileText className="w-4 h-4 mr-2" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="import" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 rounded-md">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="agents" className="space-y-6">
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Agent Management</CardTitle>
                  <div className="flex gap-2">
                    <Link href="/admin/agents/new">
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Agent
                      </Button>
                    </Link>
                    <Link href="/admin/agents">
                      <Button variant="outline">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Manage Agents
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agents?.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {agent.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{agent.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{agent.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={agent.role === 'senior_agent' ? 'default' : 'secondary'}>
                          {agent.role.replace('_', ' ')}
                        </Badge>
                        <Link href={`/admin/agents/${agent.id}/edit`}>
                          <Button size="sm">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin-users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Admin User Management</CardTitle>
                  <Link href="/admin/admin-users">
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Manage Admin Users
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Admin User Management
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create, edit, and manage admin users who can access the admin panel
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Control access levels and permissions for administrative functions
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Wifi className="w-5 h-5" />
                    <span>Channel Configuration</span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Link href="/admin/channels">
                      <Button>
                        Configure Channels
                      </Button>
                    </Link>
                    <Link href="/admin/logs">
                      <Button variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        System Logs
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Configure communication channels like Email, WhatsApp, Twitter, and Facebook
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Set up integrations to receive and respond to customer inquiries
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whitelabel" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="w-5 h-5" />
                    <span>Whitelabel Configuration</span>
                  </CardTitle>
                  <Link href="/admin/whitelabel/edit">
                    <Button>
                      Edit Branding
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Company Information</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Company: {whitelabelConfig?.companyName || 'Not configured'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Support Email: {whitelabelConfig?.supportEmail || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Visual Branding</h4>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Primary Color:</span>
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6' }}
                      />
                      <span className="text-sm font-mono">
                        {whitelabelConfig?.primaryColor || '#3b82f6'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Status: {whitelabelConfig?.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Application Settings</span>
                  </CardTitle>
                  <Link href="/admin/settings">
                    <Button>
                      Manage Settings
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Configure application-wide settings and preferences
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Manage security, notifications, integrations, and more
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>System Analytics</span>
                  </CardTitle>
                  <Link href="/admin/analytics">
                    <Button>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Full Analytics
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats?.totalTickets || 0}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats?.resolvedTickets || 0}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Resolved Tickets</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{stats?.totalAdmins || 0}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Admin Users</p>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    Get detailed insights into ticket trends, agent performance, and channel analytics
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>System Logs</span>
                  </CardTitle>
                  <Link href="/admin/logs">
                    <Button>
                      <FileText className="w-4 h-4 mr-2" />
                      View All Logs
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    System Activity Logs
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Monitor system activities, email polling, ticket creation, and error tracking
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Track all system events and troubleshoot issues with detailed logging
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Data Import</CardTitle>
                  <Badge variant="secondary">Migration Tools</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Freshdesk Import
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Import tickets, customers, and attachments from Freshdesk CSV export
                  </p>
                  <Link href="/admin/freshdesk-import">
                    <Button className="hover-lift">
                      <Upload className="w-4 h-4 mr-2" />
                      Start Import
                    </Button>
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                    Supports CSV files with attachments and preserves ticket history
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}