import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  X, 
  Reply, 
  TrendingUp, 
  UserPlus,
  Mail, 
  MessageCircle, 
  AtSign, 
  Facebook,
  ExternalLink
} from "lucide-react";
import type { Ticket, TicketWithAgent, Message } from "@shared/schema";

interface TicketDetailProps {
  ticket: TicketWithAgent | null;
  onClose: () => void;
  onRespond: () => void;
  onViewFull?: (ticket: TicketWithAgent) => void;
  onEscalate?: (ticket: TicketWithAgent) => void;
  onReassign?: (ticket: TicketWithAgent) => void;
}

export default function TicketDetail({ ticket, onClose, onRespond, onViewFull, onEscalate, onReassign }: TicketDetailProps) {
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/agent/tickets", ticket?.id, "messages"],
    enabled: !!ticket?.id,
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

  if (!ticket) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>Select a ticket to view details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Ticket Details</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {ticket.subject}
            </h4>
            <div className="flex items-center space-x-2 mb-3">
              <Badge className={`priority-${ticket.priority}`}>
                {ticket.priority} Priority
              </Badge>
              <Badge className={`status-${ticket.status}`}>
                {ticket.status.replace('-', ' ')}
              </Badge>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ticket ID:</span>
                <span className="font-medium">{ticket.ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Channel:</span>
                <span className="flex items-center">
                  {getChannelIcon(ticket.channel)}
                  <span className="ml-1 capitalize">{ticket.channel}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span>{ticket.customerContact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assigned to:</span>
                <div className="flex items-center space-x-2">
                  {ticket.assignedAgent ? (
                    <>
                      {ticket.assignedAgent.avatar ? (
                        <img
                          src={ticket.assignedAgent.avatar}
                          alt="Assigned agent"
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {ticket.assignedAgent.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span>{ticket.assignedAgent.name}</span>
                    </>
                  ) : (
                    <span>Unassigned</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span>{formatTimeAgo(ticket.createdAt!)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last updated:</span>
                <span>{formatTimeAgo(ticket.updatedAt!)}</span>
              </div>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Conversation</h5>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {/* Initial ticket message */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {ticket.customerName.charAt(0)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-900">
                      {ticket.customerName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(ticket.createdAt!)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{ticket.description}</p>
                </div>

                {/* Additional messages */}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.isFromAgent ? "bg-blue-50 rounded-lg p-3" : "bg-gray-50 rounded-lg p-3"}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {message.senderName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">
                        {message.senderName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(message.createdAt!)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{message.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h5>
            <div className="space-y-2">
              {onViewFull && (
                <Button variant="outline" className="w-full" onClick={() => onViewFull(ticket)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full Details
                </Button>
              )}
              <Button className="w-full" onClick={onRespond}>
                <Reply className="w-4 h-4 mr-2" />
                Reply to Customer
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => onEscalate && onEscalate(ticket)}
                disabled={!onEscalate}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Escalate Ticket
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => onReassign && onReassign(ticket)}
                disabled={!onReassign}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Reassign Ticket
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
