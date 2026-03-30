import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentLayout } from "@/components/agent-layout";
import { AgentPerformanceVisualization } from "@/components/agent-performance-viz";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Eye,
  User,
  MessageSquare,
  Calendar,
  BarChart3,
  TrendingUp,
  Inbox,
} from "lucide-react";

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

function StatCard({
  title, value, icon: Icon, iconBg, trend
}: { title: string; value: number; icon: any; iconBg: string; trend?: string }) {
  return (
    <Card className="card-elevated animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketRow({ ticket, showAssign = false }: { ticket: any; showAssign?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const assignMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/agent/tickets/${ticket.id}/assign`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/dashboard"] });
      toast({ title: "Ticket assigned to you." });
    },
    onError: () => toast({ title: "Failed to assign ticket.", variant: "destructive" }),
  });

  const statusClass =
    ticket.status === "open" ? "badge-open" :
    ticket.status === "in-progress" ? "badge-in-progress" :
    ticket.status === "resolved" ? "badge-resolved" : "badge-closed";

  const priorityClass =
    ticket.priority === "high" ? "badge-high" :
    ticket.priority === "medium" ? "badge-medium" : "badge-low";

  return (
    <div className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all duration-200">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticketNumber}</span>
          <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
            {ticket.status.replace("-", " ")}
          </span>
          <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityClass}`}>
            {ticket.priority}
          </span>
        </div>
        <h3 className="font-medium text-sm text-foreground truncate mb-1">{ticket.subject}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />{ticket.customerName}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />{ticket.channel}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/agents/tickets/${ticket.id}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <Eye className="w-3 h-3" />View
          </Button>
        </Link>
        {showAssign && (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending}
          >
            Assign to Me
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AgentDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: dashboardData, isLoading } = useQuery<AgentDashboardData>({
    queryKey: ["/api/agent/dashboard"],
  });

  const filter = (tickets: any[] = []) =>
    tickets.filter(t => {
      const s = t.subject?.toLowerCase() + t.customerName?.toLowerCase();
      const matchSearch = !searchTerm || s.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });

  const myTickets = filter(dashboardData?.myTickets);
  const available = filter(dashboardData?.availableTickets);

  if (isLoading) {
    return (
      <AgentLayout title="Dashboard" subtitle="Loading your workspace…">
        <div className="section-grid-4 stagger">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </AgentLayout>
    );
  }

  const stats = dashboardData?.stats;

  return (
    <AgentLayout title="Dashboard" subtitle="Manage your tickets and assignments">
      {/* Stats */}
      <div className="section-grid-4 stagger">
        <StatCard title="My Open Tickets"    value={stats?.myOpenTickets    || 0} icon={TicketIcon}   iconBg="bg-blue-50 text-blue-600" />
        <StatCard title="In Progress"        value={stats?.myInProgressTickets || 0} icon={Clock}    iconBg="bg-amber-50 text-amber-600" />
        <StatCard title="Resolved Today"     value={stats?.myResolvedToday  || 0} icon={CheckCircle} iconBg="bg-emerald-50 text-emerald-600" />
        <StatCard title="Available Tickets"  value={stats?.availableTickets || 0} icon={Inbox}       iconBg="bg-purple-50 text-purple-600" />
      </div>

      {/* Filters */}
      <Card className="card-elevated mb-5">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by subject or customer…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
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

      {/* Tabs */}
      <Tabs defaultValue="my-tickets" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="my-tickets" className="text-xs gap-1.5">
            <TicketIcon className="w-3.5 h-3.5" />My Tickets ({myTickets.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="text-xs gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />Available ({available.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-tickets">
          {myTickets.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground animate-fade-in">
              <TicketIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No tickets assigned to you yet</p>
            </div>
          ) : (
            <div className="space-y-2 animate-fade-in">
              {myTickets.map(t => <TicketRow key={t.id} ticket={t} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available">
          {available.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground animate-fade-in">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">All tickets are currently assigned</p>
            </div>
          ) : (
            <div className="space-y-2 animate-fade-in">
              {available.map(t => <TicketRow key={t.id} ticket={t} showAssign />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance">
          <AgentPerformanceVisualization />
        </TabsContent>
      </Tabs>
    </AgentLayout>
  );
}