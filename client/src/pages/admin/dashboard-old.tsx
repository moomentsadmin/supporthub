import { useQuery } from "@tanstack/react-query";
import type { WhitelabelConfig } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin-layout";
import { 
  Users, 
  UserPlus, 
  Palette,
  Shield,
  MessageSquare,
  Monitor,
  Tickets,
  TrendingUp,
  Activity
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
  const { data: stats } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"]
  });

  const { data: agents } = useQuery<AdminAgent[]>({
    queryKey: ["/api/admin/agents"]
  });

  return (
    <AdminLayout title="Admin Dashboard">
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
            <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 text-gray-900 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5" />
              Dashboard
            </Link>
            <Link href="/admin/analytics" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <TrendingUp className="h-5 w-5" />
              Analytics
            </Link>
            <Link href="/admin/agents" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Users className="h-5 w-5" />
              Agents
            </Link>
            <Link href="/admin/admin-users" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Shield className="h-5 w-5" />
              Admin Users
            </Link>
            <Link href="/admin/channels" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <MessageSquare className="h-5 w-5" />
              Channels
            </Link>
            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <Link href="/admin/logs" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <FileText className="h-5 w-5" />
              System Logs
            </Link>
            <Link href="/admin/freshdesk-import" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Upload className="h-5 w-5" />
              Import Data
            </Link>
            <Link href="/admin/widget" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
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
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {adminUser.name}
              </h1>
              <p className="mt-2 text-gray-600">
                Here's an overview of your support system
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Tickets</CardTitle>
                  <Tickets className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats?.totalTickets || 0}</div>
                  <p className="text-xs text-gray-500">
                    +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Open Tickets</CardTitle>
                  <Activity className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats?.openTickets || 0}</div>
                  <p className="text-xs text-gray-500">
                    Active support requests
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Agents</CardTitle>
                  <Users className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats?.activeAgents || 0}</div>
                  <p className="text-xs text-gray-500">
                    Out of {stats?.totalAgents || 0} total
                  </p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Chat Sessions</CardTitle>
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats?.activeChatSessions || 0}</div>
                  <p className="text-xs text-gray-500">
                    Active conversations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border shadow-sm mb-8">
              <CardHeader>
                <CardTitle className="text-gray-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/admin/agents/new">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Agent
                    </Button>
                  </Link>
                  <Link href="/admin/admin-users">
                    <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Admins
                    </Button>
                  </Link>
                  <Link href="/admin/channels">
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Manage Channels
                    </Button>
                  </Link>
                  <Link href="/admin/settings">
                    <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                      <Settings className="h-4 w-4 mr-2" />
                      System Settings
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity & Agents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">Recent Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.recentTickets?.slice(0, 5).map((ticket: any) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">{ticket.subject}</p>
                          <p className="text-sm text-gray-600">{ticket.customerName}</p>
                        </div>
                        <Badge className={
                          ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                          ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {ticket.priority}
                        </Badge>
                      </div>
                    )) || (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No recent tickets</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {agents?.slice(0, 5).map((agent: AdminAgent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{agent.name}</p>
                            <p className="text-sm text-gray-600">{agent.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border">
                          {agent.role}
                        </Badge>
                      </div>
                    )) || (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No agents available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
    </AdminLayout>
  );
}