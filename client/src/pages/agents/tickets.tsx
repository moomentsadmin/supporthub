import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import TicketList from "@/components/ticket-list";
import TicketDetail from "@/components/ticket-detail";
import ResponseModal from "@/components/response-modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Mail, MessageSquare, AtSign, Facebook } from "lucide-react";
import type { TicketWithAgent } from "@shared/schema";

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

const statusColors = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "in-progress": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "email": return <Mail className="w-4 h-4" />;
    case "whatsapp": return <MessageSquare className="w-4 h-4" />;
    case "twitter": return <AtSign className="w-4 h-4" />;
    case "facebook": return <Facebook className="w-4 h-4" />;
    default: return <Mail className="w-4 h-4" />;
  }
};

export default function AgentTickets() {
  const [, setLocation] = useLocation();
  const [selectedTicket, setSelectedTicket] = useState<TicketWithAgent | null>(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: tickets = [], isLoading } = useQuery<TicketWithAgent[]>({
    queryKey: ["/api/agent/tickets"]
  });

  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.customerContact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleTicketClick = (ticket: TicketWithAgent) => {
    setSelectedTicket(ticket);
    // Navigate to individual ticket page
    setLocation(`/agents/tickets/${ticket.id}`);
  };

  const handleViewTicketDetail = (ticket: TicketWithAgent) => {
    // Direct navigation to ticket detail page
    setLocation(`/agents/tickets/${ticket.id}`);
  };

  const handleEscalateTicket = (ticket: TicketWithAgent) => {
    // TODO: Implement escalate ticket modal/functionality
    console.log('Escalating ticket:', ticket.id);
    // For now, navigate to ticket detail for full escalation options
    setLocation(`/agents/tickets/${ticket.id}`);
  };

  const handleReassignTicket = (ticket: TicketWithAgent) => {
    // TODO: Implement reassign ticket modal/functionality
    console.log('Reassigning ticket:', ticket.id);
    // For now, navigate to ticket detail for full reassignment options
    setLocation(`/agents/tickets/${ticket.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 ml-64 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">All Tickets</h2>
            
            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
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
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tickets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Tickets ({filteredTickets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p>Loading tickets...</p>
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                            selectedTicket?.id === ticket.id ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" : "bg-white dark:bg-gray-800"
                          }`}
                          onClick={() => handleTicketClick(ticket)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  #{ticket.ticketNumber || ticket.id.slice(-6)}
                                </span>
                                <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                                  {ticket.priority.toUpperCase()}
                                </Badge>
                                <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                                  {ticket.status.replace("-", " ").toUpperCase()}
                                </Badge>
                              </div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                {ticket.subject}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {ticket.description.substring(0, 100)}...
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className="flex items-center space-x-1">
                                  {getChannelIcon(ticket.channel)}
                                  <span className="capitalize">{ticket.channel}</span>
                                </span>
                                <span>{ticket.customerContact}</span>
                                <span>
                                  {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : "Unknown"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {ticket.assignedAgent ? (
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {ticket.assignedAgent.name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Unassigned</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <TicketDetail 
                ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onRespond={() => setResponseModalOpen(true)}
                onViewFull={handleViewTicketDetail}
                onEscalate={handleEscalateTicket}
                onReassign={handleReassignTicket}
              />
            </div>
          </div>
        </main>
      </div>

      <ResponseModal 
        ticket={selectedTicket}
        open={responseModalOpen}
        onClose={() => setResponseModalOpen(false)}
      />
    </div>
  );
}