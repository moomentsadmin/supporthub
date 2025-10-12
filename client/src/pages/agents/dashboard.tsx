import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { 
  Tickets, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  Eye,
  MessageSquare,
  User,
  Calendar,
  MessageCircle,
  LayoutDashboard,
  BarChart3,
  Activity,
  TrendingUp
} from "lucide-react";
import { AgentPerformanceVisualization } from "@/components/agent-performance-viz";
import { useMicroInteractions } from "@/hooks/useMicroInteractions";
import { ToastContainer } from "@/components/ui/animated-toast";
import { Link } from "wouter";

interface AgentDashboardData {
  myTickets: any[];
  availableTickets: any[];
  stats: {
    myOpenTickets: number;
    myInProgressTickets: number;
    myResolvedToday: number;
    availableTickets: number;
  };
}

export default function AgentDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { showSuccess, showError, triggerButtonFeedback, buttonStates, toasts } = useMicroInteractions();

  const { data: dashboardData, isLoading } = useQuery<AgentDashboardData>({
    queryKey: ["/api/agent/dashboard"]
  });

  const filteredMyTickets = dashboardData?.myTickets?.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  }) || [];

  const filteredAvailableTickets = dashboardData?.availableTickets?.filter((ticket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center space-x-2 mb-2">
                <LayoutDashboard className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Agent Dashboard
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your tickets and view available assignments
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 ml-64 p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-2">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Agent Dashboard
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your tickets and view available assignments
            </p>
          </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover-lift card-stagger">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">My Open Tickets</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  <AnimatedCounter value={dashboardData?.stats?.myOpenTickets || 0} />
                </p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Tickets className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift card-stagger">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  <AnimatedCounter value={dashboardData?.stats?.myInProgressTickets || 0} />
                </p>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="mt-3">
              <ProgressIndicator 
                value={dashboardData?.stats?.myInProgressTickets || 0} 
                max={10} 
                variant="warning" 
                className="h-1" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift card-stagger">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved Today</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  <AnimatedCounter value={dashboardData?.stats?.myResolvedToday || 0} />
                </p>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift card-stagger">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Tickets</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  <AnimatedCounter value={dashboardData?.stats?.availableTickets || 0} />
                </p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg animate-pulse-gentle">
                <AlertCircle className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 animate-slide-up hover-lift">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors duration-200" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-focus transition-all duration-200 hover:border-blue-300"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Tabs */}
      <Tabs defaultValue="my-tickets" className="space-y-6 animate-slide-up">
        <TabsList className="grid w-full grid-cols-3 hover-lift">
          <TabsTrigger value="my-tickets" className="transition-all duration-200 hover-scale">
            <Tickets className="w-4 h-4 mr-2" />
            My Tickets (<AnimatedCounter value={filteredMyTickets.length} />)
          </TabsTrigger>
          <TabsTrigger value="available-tickets" className="transition-all duration-200 hover-scale">
            <AlertCircle className="w-4 h-4 mr-2" />
            Available Tickets (<AnimatedCounter value={filteredAvailableTickets.length} />)
          </TabsTrigger>
          <TabsTrigger value="performance" className="transition-all duration-200 hover-scale">
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-tickets" className="space-y-4">
          {filteredMyTickets.length === 0 ? (
            <Card className="animate-fade-in">
              <CardContent className="p-8 text-center">
                <div className="animate-bounce-in">
                  <Tickets className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No tickets assigned
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have any tickets assigned to you yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMyTickets.map((ticket, index) => (
                <Card 
                  key={ticket.id} 
                  className="hover-lift transition-all duration-300 animate-fade-in border-l-4 border-l-blue-500"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {ticket.subject}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {ticket.ticketNumber}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{ticket.customerName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span className="capitalize">{ticket.channel}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        <div className="flex space-x-2">
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
                        
                        <Link href={`/agents/tickets/${ticket.id}`}>
                          <Button size="sm" className="hover-scale hover-glow">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available-tickets" className="space-y-4">
          {filteredAvailableTickets.length === 0 ? (
            <Card className="animate-fade-in">
              <CardContent className="p-8 text-center">
                <div className="animate-bounce-in">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No available tickets
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  All tickets are currently assigned to agents.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAvailableTickets.map((ticket, index) => (
                <Card 
                  key={ticket.id} 
                  className="hover-lift transition-all duration-300 animate-fade-in border-l-4 border-l-purple-500"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {ticket.subject}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {ticket.ticketNumber}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{ticket.customerName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span className="capitalize">{ticket.channel}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        <div className="flex space-x-2">
                          <Badge variant={
                            ticket.priority === 'high' ? 'destructive' :
                            ticket.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {ticket.priority}
                          </Badge>
                          <Badge variant="secondary">
                            Unassigned
                          </Badge>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Link href={`/agents/tickets/${ticket.id}`}>
                            <Button size="sm" variant="secondary">
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </Link>
                          <Button size="sm">
                            Assign to Me
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <AgentPerformanceVisualization />
        </TabsContent>
      </Tabs>
        </main>
      </div>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}