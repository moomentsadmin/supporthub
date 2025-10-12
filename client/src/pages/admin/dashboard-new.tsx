import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
              {stats?.openTickets && stats.totalTickets ? 
                `${Math.round((stats.openTickets / stats.totalTickets) * 100)}% of total` : 
                "0% of total"
              }
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalAgents || 0}</div>
            <p className="text-xs text-gray-500">
              {stats?.activeAgents || 0} currently active
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Resolution Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.totalTickets ? 
                Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 
                0
              }%
            </div>
            <p className="text-xs text-gray-500">
              {stats?.resolvedTickets || 0} tickets resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/admin/agents" 
                className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
              >
                <UserPlus className="h-8 w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Add Agent</span>
              </Link>
              
              <Link 
                href="/admin/admin-users" 
                className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 group"
              >
                <Shield className="h-8 w-8 text-gray-400 group-hover:text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Manage Admins</span>
              </Link>
              
              <Link 
                href="/admin/channels" 
                className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
              >
                <MessageSquare className="h-8 w-8 text-gray-400 group-hover:text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">Setup Channel</span>
              </Link>
              
              <Link 
                href="/admin/widget" 
                className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 group"
              >
                <Monitor className="h-8 w-8 text-gray-400 group-hover:text-orange-600 mb-2" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-orange-700">Widget Setup</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Agents */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents?.slice(0, 5).map((agent) => (
                <div key={agent.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
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
    </AdminLayout>
  );
}