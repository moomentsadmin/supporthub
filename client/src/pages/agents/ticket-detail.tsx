import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QuickStatusWidget } from "@/components/quick-status-widget";
import { CircularProgress } from "@/components/ui/progress-indicator";
import { useMicroInteractions } from "@/hooks/useMicroInteractions";
import { ToastContainer } from "@/components/ui/animated-toast";
import { 
  ArrowLeft, 
  Send, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageSquare,
  AtSign,
  Facebook,
  AlertCircle,
  CheckCircle,
  Forward
} from "lucide-react";
import type { TicketWithAgent, Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { AttachmentList } from "@/components/AttachmentList";
import { ForwardTicketDialog } from "@/components/forward-ticket-dialog";
import { TicketForwardingHistory } from "@/components/ticket-forwarding-history";
import { EnhancedEmailReply } from "@/components/enhanced-email-reply";
import { TicketEmailTrail } from "@/components/ticket-email-trail";
import { AgentSignatureEditor } from "@/components/agent-signature-editor";

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

const channelIcons = {
  email: Mail,
  whatsapp: MessageSquare,
  twitter: AtSign,
  facebook: Facebook
};

export default function AgentTicketDetail() {
  const params = useParams();
  const ticketId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const { showSuccess, showError, triggerButtonFeedback, buttonStates, toasts } = useMicroInteractions();

  // Ensure we have a valid ticketId before proceeding
  if (!ticketId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Invalid Ticket ID</h1>
              <Button onClick={() => setLocation("/agents/tickets")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tickets
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const { data: ticket, isLoading, error } = useQuery<TicketWithAgent>({
    queryKey: ["/api/tickets", ticketId],
    enabled: !!ticketId,
    retry: 3,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/tickets", ticketId, "messages"],
    enabled: !!ticketId,
    retry: 3,
  });

  // Set initial status when ticket loads
  useEffect(() => {
    if (ticket && !newStatus) {
      setNewStatus(ticket.status);
    }
  }, [ticket]);

  const replyMutation = useMutation({
    mutationFn: async (data: { message: string; status?: string; sendEmail?: boolean }) => {
      const response = await apiRequest("POST", `/api/tickets/${ticketId}/reply`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/my-tickets"] });
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent successfully",
      });
      setReplyMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/tickets/${ticketId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/my-tickets"] });
      toast({
        title: "Status Updated",
        description: "Ticket status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleReply = () => {
    if (!replyMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply message",
        variant: "destructive",
      });
      return;
    }

    const data: { message: string; status?: string; sendEmail?: boolean } = { 
      message: replyMessage,
      sendEmail: sendEmail 
    };
    
    // Include status update if it changed
    if (newStatus !== ticket?.status) {
      data.status = newStatus;
    }

    replyMutation.mutate(data);
  };

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    updateStatusMutation.mutate(status);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading ticket {ticketId}...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Error loading ticket:", error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Ticket</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error instanceof Error ? error.message : "Failed to load ticket"}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
                <Button variant="secondary" onClick={() => setLocation("/agents/tickets")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Tickets
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Ticket Not Found</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Ticket ID: {ticketId}
              </p>
              <Button onClick={() => setLocation("/agents/tickets")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tickets
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const ChannelIcon = channelIcons[ticket.channel as keyof typeof channelIcons] || Mail;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 ml-64 p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/agents/tickets")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Tickets
                </Button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Ticket #{ticket.id}
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                  {ticket.priority.toUpperCase()}
                </Badge>
                <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                  {ticket.status.replace("-", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ticket Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Ticket Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <div className="flex items-center space-x-1">
                          <ChannelIcon className="w-4 h-4" />
                          <span>{ticket.channel}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "Unknown date"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ForwardTicketDialog 
                        ticketId={ticket.id}
                        ticketNumber={ticket.ticketNumber}
                        ticketSubject={ticket.subject}
                      />
                      <Select value={newStatus} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p style={{ whiteSpace: 'pre-line' }}>{ticket.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                        No messages yet. Be the first to reply!
                      </p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg ${
                            message.sender === "agent"
                              ? "bg-blue-50 dark:bg-blue-900/20 ml-8"
                              : "bg-gray-50 dark:bg-gray-800 mr-8"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                message.sender === "agent" ? "bg-blue-500" : "bg-gray-500"
                              }`} />
                              <span className="font-medium text-sm">
                                {message.sender === "agent" ? "Agent" : ticket.customerName}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {message.createdAt ? new Date(message.createdAt).toLocaleString() : "Unknown date"}
                            </span>
                          </div>
                          <p style={{ whiteSpace: 'pre-line' }}>{message.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Email Reply */}
              <EnhancedEmailReply 
                ticket={ticket}
                onReply={() => {
                  queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}/messages`] });
                  queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
                  showSuccess("Reply sent successfully!");
                }}
                className="hover-lift animate-slide-up" 

              />

              {/* Email Trail */}
              <TicketEmailTrail 
                ticketId={ticket.id}
                className="hover-lift animate-slide-up" 

              />
            </div>

            {/* Customer Details */}
            <div className="space-y-6">
              {/* Quick Status Widget */}
              <QuickStatusWidget 
                ticket={ticket} 
                onStatusChange={(newStatus) => {
                  setNewStatus(newStatus);
                  queryClient.invalidateQueries({ queryKey: [`/api/agent/tickets/${ticketId}`] });
                }}
                className="animate-slide-up"
              />

              <AttachmentList ticketId={ticket.id} />
              
              <TicketForwardingHistory ticketId={ticket.id} />
              
              {/* Agent Signature Editor */}
              <AgentSignatureEditor className="hover-lift animate-slide-up" />
              
              <Card className="hover-lift animate-slide-up">
                <CardHeader>
                  <CardTitle>Customer Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{ticket.customerName}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contact</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{ticket.customerContact}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Channel</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <ChannelIcon className="w-4 h-4 text-gray-500" />
                        <span className="capitalize">{ticket.channel}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Agent</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{ticket.assignedAgent?.name || "Unassigned"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}