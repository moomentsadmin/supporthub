import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, MessageCircle, AtSign, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ticket, TicketWithAgent } from "@shared/schema";

interface TicketListProps {
  onSelectTicket: (ticket: Ticket) => void;
  selectedTicket: Ticket | null;
}

export default function TicketList({ onSelectTicket, selectedTicket }: TicketListProps) {
  const { data: tickets = [], isLoading } = useQuery<TicketWithAgent[]>({
    queryKey: ["/api/agent/tickets"]
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="w-4 h-4" />;
      case "whatsapp": return <MessageCircle className="w-4 h-4" />;
      case "twitter": return <AtSign className="w-4 h-4" />;
      case "facebook": return <Facebook className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours === 0) return "Just now";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Tickets</h3>
          <div className="flex items-center space-x-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Ticket
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        {tickets.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No tickets found
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={cn(
                "border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer",
                selectedTicket?.id === ticket.id && "bg-blue-50"
              )}
              onClick={() => onSelectTicket(ticket)}
            >
              <div className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {ticket.ticketNumber}
                      </span>
                      <Badge className={`priority-${ticket.priority}`}>
                        {ticket.priority} Priority
                      </Badge>
                      <Badge className={`status-${ticket.status}`}>
                        {ticket.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {ticket.subject}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {ticket.description.substring(0, 100)}...
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        {getChannelIcon(ticket.channel)}
                        <span className="ml-1 capitalize">{ticket.channel}</span>
                      </span>
                      <span>{ticket.customerContact}</span>
                      <span>{formatTimeAgo(ticket.updatedAt!)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {ticket.assignedAgent ? (
                      <>
                        {ticket.assignedAgent.avatar ? (
                          <img
                            src={ticket.assignedAgent.avatar}
                            alt="Assigned agent"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {ticket.assignedAgent.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-gray-600">
                          {ticket.assignedAgent.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {tickets.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Showing 1-{tickets.length} of {tickets.length} tickets
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="default" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
