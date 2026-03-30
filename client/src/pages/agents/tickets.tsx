import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AgentLayout } from "@/components/agent-layout";
import TicketDetail from "@/components/ticket-detail";
import ResponseModal from "@/components/response-modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, MessageSquare, AtSign, Facebook } from "lucide-react";
import type { TicketWithAgent } from "@shared/schema";

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "email": return <Mail className="w-3 h-3" />;
    case "whatsapp": return <MessageSquare className="w-3 h-3" />;
    case "twitter": return <AtSign className="w-3 h-3" />;
    case "facebook": return <Facebook className="w-3 h-3" />;
    default: return <Mail className="w-3 h-3" />;
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
    queryKey: ["/api/agent/tickets"],
  });

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customerContact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleTicketClick = (ticket: TicketWithAgent) => {
    setSelectedTicket(ticket);
    setLocation(`/agents/tickets/${ticket.id}`);
  };

  const handleViewTicketDetail = (ticket: TicketWithAgent) => {
    setLocation(`/agents/tickets/${ticket.id}`);
  };

  const handleEscalateTicket = (ticket: TicketWithAgent) => {
    setLocation(`/agents/tickets/${ticket.id}`);
  };

  const handleReassignTicket = (ticket: TicketWithAgent) => {
    setLocation(`/agents/tickets/${ticket.id}`);
  };

  return (
    <>
      <AgentLayout title="All Tickets" subtitle={`${filteredTickets.length} ticket${filteredTickets.length !== 1 ? "s" : ""} found`}>
        {/* Filters */}
        <Card className="card-elevated mb-4">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
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
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Split view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="card-elevated">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-sm font-semibold">Tickets ({filteredTickets.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading tickets…</div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No tickets found</div>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors text-sm ${
                        selectedTicket?.id === ticket.id
                          ? "bg-primary/5 border-primary/30"
                          : "bg-card border-border hover:bg-muted/40"
                      }`}
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">#{ticket.ticketNumber || ticket.id.slice(-6)}</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              {getChannelIcon(ticket.channel)}{ticket.channel}
                            </span>
                          </div>
                          <h4 className="font-medium truncate text-foreground">{ticket.subject}</h4>
                          <p className="text-xs text-muted-foreground truncate">{ticket.customerName} · {ticket.customerContact}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge className={`text-[10px] px-1.5 py-0 border-0 ${
                            ticket.priority === "high" ? "bg-red-50 text-red-700" :
                            ticket.priority === "medium" ? "bg-amber-50 text-amber-700" :
                            "bg-green-50 text-green-700"
                          }`}>
                            {ticket.priority}
                          </Badge>
                          <Badge className={`text-[10px] px-1.5 py-0 border-0 ${
                            ticket.status === "open" ? "bg-blue-50 text-blue-700" :
                            ticket.status === "in-progress" ? "bg-amber-50 text-amber-700" :
                            ticket.status === "resolved" ? "bg-emerald-50 text-emerald-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {ticket.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
      </AgentLayout>

      <ResponseModal
        ticket={selectedTicket}
        open={responseModalOpen}
        onClose={() => setResponseModalOpen(false)}
      />
    </>
  );
}