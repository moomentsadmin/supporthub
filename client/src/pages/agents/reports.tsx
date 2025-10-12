import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Timer,
  Activity
} from "lucide-react";
import type { DashboardStats } from "@shared/schema";

// Define AgentPerformance type since it doesn't exist in schema
interface AgentPerformance {
  agentId: string;
  agentName: string;
  ticketsHandled: number;
  avgResolutionTime: string;
  satisfactionScore: number;
}

export default function AgentReports() {
  const [timeRange, setTimeRange] = useState("7d");

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", { timeRange }]
  });

  const { data: agentPerformance = [] } = useQuery<AgentPerformance[]>({
    queryKey: ["/api/agent/performance", { timeRange }]
  });

  const { data: myPerformance } = useQuery<AgentPerformance>({
    queryKey: ["/api/agent/my-performance", { timeRange }]
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 ml-64 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Performance Reports
              </h1>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tickets</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {(stats?.openTickets || 0) + (stats?.inProgressTickets || 0) + (stats?.resolvedToday || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.resolvedToday || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.avgResponse || "0h"}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <Timer className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Issues</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.openTickets || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Performance */}
            {myPerformance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>My Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tickets Handled</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {myPerformance.ticketsHandled || 0}
                        </p>
                      </div>
                      <Activity className="w-8 h-8 text-blue-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Resolution Time</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {myPerformance.avgResolutionTime || "0h"}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Customer Satisfaction</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {myPerformance.satisfactionScore || 0}%
                          </p>
                          <Badge 
                            variant={
                              (myPerformance.satisfactionScore || 0) >= 90 ? "default" :
                              (myPerformance.satisfactionScore || 0) >= 75 ? "secondary" : "destructive"
                            }
                          >
                            {(myPerformance.satisfactionScore || 0) >= 90 ? "Excellent" :
                             (myPerformance.satisfactionScore || 0) >= 75 ? "Good" : "Needs Improvement"
                            }
                          </Badge>
                        </div>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Team Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentPerformance.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No performance data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agentPerformance.slice(0, 8).map((agent) => (
                      <div key={agent.agentId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {agent.agentName?.charAt(0).toUpperCase() || "A"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {agent.agentName || `Agent ${agent.agentId}`}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {agent.ticketsHandled || 0} tickets
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {agent.satisfactionScore || 0}%
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {agent.avgResolutionTime || "0h"} avg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}