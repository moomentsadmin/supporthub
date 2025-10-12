import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin-layout";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  MessageSquare,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface TicketAnalytics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  inProgressTickets: number;
  highPriorityTickets: number;
  ticketsByChannel: { channel: string; count: number }[];
  ticketsByStatus: { status: string; count: number }[];
  ticketsByPriority: { priority: string; count: number }[];
  ticketsByAgent: { agentName: string; count: number }[];
  recentTickets: any[];
  avgResolutionTime: number;
  ticketTrends: { date: string; count: number }[];
}

export default function AdminAnalytics() {
  const { data: analytics, isLoading } = useQuery<TicketAnalytics>({
    queryKey: ["/api/admin/analytics"]
  });

  if (isLoading) {
    return (
      <AdminLayout title="Analytics Dashboard">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics Dashboard">
      <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tickets</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {analytics?.totalTickets || 0}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Tickets</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {analytics?.openTickets || 0}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {analytics?.resolvedTickets || 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">High Priority</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {analytics?.highPriorityTickets || 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Data */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.ticketsByStatus?.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            item.status === 'open' ? 'destructive' :
                            item.status === 'in-progress' ? 'default' :
                            item.status === 'resolved' ? 'secondary' : 'outline'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.ticketsByPriority?.map((item) => (
                      <div key={item.priority} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            item.priority === 'high' ? 'destructive' :
                            item.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {item.priority}
                          </Badge>
                        </div>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Tickets */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.recentTickets?.slice(0, 10).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {ticket.subject}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {ticket.customerName} • {ticket.channel}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          ticket.priority === 'high' ? 'destructive' :
                          ticket.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {ticket.priority}
                        </Badge>
                        <Badge variant={
                          ticket.status === 'open' ? 'destructive' :
                          ticket.status === 'in-progress' ? 'default' : 'secondary'
                        }>
                          {ticket.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.ticketsByChannel?.map((item) => (
                    <div key={item.channel} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium capitalize">{item.channel}</span>
                      </div>
                      <span className="font-semibold text-lg">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.ticketsByAgent?.map((item) => (
                    <div key={item.agentName} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium">{item.agentName || 'Unassigned'}</span>
                      </div>
                      <span className="font-semibold text-lg">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Ticket Trends Chart
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Historical ticket data and trends will be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}