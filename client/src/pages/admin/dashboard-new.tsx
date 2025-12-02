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
        <Card className="border-0 shadow-lg shadow-blue-100/50 hover-lift transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Tickets</CardTitle>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Tickets className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.totalTickets || 0}</div>
            <p className="text-xs font-medium text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-orange-100/50 hover-lift transition-all duration-300 bg-gradient-to-br from-white to-orange-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Open Tickets</CardTitle>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Activity className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.openTickets || 0}</div>
            <p className="text-xs font-medium text-gray-600">
              {stats?.openTickets && stats.totalTickets ? 
                `${Math.round((stats.openTickets / stats.totalTickets) * 100)}% of total` : 
                "0% of total"
              }
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-purple-100/50 hover-lift transition-all duration-300 bg-gradient-to-br from-white to-purple-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Total Agents</CardTitle>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.totalAgents || 0}</div>
            <p className="text-xs font-medium text-gray-600">
              {stats?.activeAgents || 0} currently active
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-green-100/50 hover-lift transition-all duration-300 bg-gradient-to-br from-white to-green-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Resolution Rate</CardTitle>
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats?.totalTickets ? 
                Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 
                0
              }%
            </div>
            <p className="text-xs font-medium text-gray-600">
              {stats?.resolvedTickets || 0} tickets resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <Card className="border-0 shadow-lg hover-lift transition-all duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Monitor className="w-4 h-4 text-blue-600" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/admin/agents" 
                className="flex flex-col items-center p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 group hover-lift"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-blue-200">
                  <UserPlus className="h-7 w-7 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-700 text-center">Add Agent</span>
              </Link>
              
              <Link 
                href="/admin/admin-users" 
                className="flex flex-col items-center p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-300 group hover-lift"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-purple-200">
                  <Shield className="h-7 w-7 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-purple-700 text-center">Manage Admins</span>
              </Link>
              
              <Link 
                href="/admin/channels" 
                className="flex flex-col items-center p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50/50 transition-all duration-300 group hover-lift"
              >
                <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-green-200">
                  <MessageSquare className="h-7 w-7 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-green-700 text-center">Setup Channel</span>
              </Link>
              
              <Link 
                href="/admin/widget" 
                className="flex flex-col items-center p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50/50 transition-all duration-300 group hover-lift"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-orange-200">
                  <Monitor className="h-7 w-7 text-orange-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-700 text-center">Widget Setup</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Agents */}
        <Card className="border-0 shadow-lg hover-lift transition-all duration-300">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              Recent Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {agents?.slice(0, 5).map((agent, index) => (
                <div 
                  key={agent.id} 
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                      <span className="text-sm font-bold text-white">
                        {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{agent.name}</p>
                      <p className="text-sm text-gray-500">{agent.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200 font-medium px-3 py-1">
                    {agent.role}
                  </Badge>
                </div>
              )) || (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No agents available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}