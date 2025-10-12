import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CircularProgress } from "@/components/ui/progress-indicator";
import { useMicroInteractions } from "@/hooks/useMicroInteractions";
import { ToastContainer } from "@/components/ui/animated-toast";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { 
  MessageCircle, 
  Send, 
  Users, 
  User,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'customer' | 'agent' | 'system';
  timestamp: string;
  senderName?: string;
}

interface ChatSession {
  id: string;
  customerName: string;
  customerEmail: string;
  status: 'waiting' | 'active' | 'ended';
  messages: ChatMessage[];
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: string;
  websiteUrl?: string;
}

export default function AgentChat() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const queryClient = useQueryClient();
  const { toasts, showSuccess, showError, triggerButtonFeedback, buttonStates } = useMicroInteractions();

  // Get all active chat sessions
  const { data: sessions = [], isLoading } = useQuery<ChatSession[]>({
    queryKey: ["/api/agent/chat-sessions"],
    refetchInterval: 5000, // Poll every 5 seconds for new sessions
  });

  // Get messages for selected session
  const { data: sessionDetails } = useQuery<ChatSession>({
    queryKey: ["/api/agent/chat-sessions", selectedSession],
    enabled: !!selectedSession,
    refetchInterval: 2000, // Poll every 2 seconds for new messages
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      const response = await fetch(`/api/agent/chat-sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      triggerButtonFeedback('send-message');
      showSuccess("Message sent successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/agent/chat-sessions", selectedSession] });
    },
    onError: () => {
      showError("Failed to send message", "Please try again or check your connection");
    }
  });

  // Assign session to agent
  const assignSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/agent/chat-sessions/${sessionId}/assign`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to assign session');
      return response.json();
    },
    onSuccess: () => {
      showSuccess("Session assigned", "You are now handling this chat session");
      queryClient.invalidateQueries({ queryKey: ["/api/agent/chat-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/chat-sessions", selectedSession] });
    },
    onError: () => {
      showError("Failed to assign session", "This session may have been taken by another agent");
    }
  });

  // End session mutation
  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/agent/chat-sessions/${sessionId}/end`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to end session');
      return response.json();
    },
    onSuccess: () => {
      showSuccess("Chat session ended", "The conversation has been closed");
      queryClient.invalidateQueries({ queryKey: ["/api/agent/chat-sessions"] });
      setSelectedSession(null);
    },
    onError: () => {
      showError("Failed to end session", "Please try again");
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedSession) return;
    sendMessage.mutate({ sessionId: selectedSession, content: messageText.trim() });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'waiting': return 'destructive';
      case 'active': return 'default';
      case 'ended': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return AlertCircle;
      case 'active': return MessageCircle;
      case 'ended': return CheckCircle;
      default: return Clock;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="flex items-center justify-center h-96">
              <div className="text-center animate-fade-in">
                <CircularProgress value={50} size={60} className="mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading chat sessions...</p>
              </div>
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
          <div className="mb-6 animate-slide-in">
            <div className="flex items-center space-x-2 mb-2">
              <MessageCircle className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Live Chat Management
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage active chat sessions and respond to customer inquiries
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Chat Sessions List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Chat Sessions ({sessions.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  {sessions.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No active chat sessions</p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {sessions.map((session) => {
                        const StatusIcon = getStatusIcon(session.status);
                        return (
                          <div
                            key={session.id}
                            onClick={() => setSelectedSession(session.id)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover-lift ${
                              selectedSession === session.id
                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 scale-105'
                                : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {session.customerName}
                              </h3>
                              <Badge variant={getStatusBadgeVariant(session.status)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {session.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {session.customerEmail}
                            </p>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(session.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="lg:col-span-2">
              {selectedSession && sessionDetails ? (
                <>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5" />
                        <div>
                          <CardTitle>{sessionDetails.customerName}</CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {sessionDetails.customerEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {sessionDetails.status === 'waiting' && (
                          <Button
                            size="sm"
                            onClick={() => assignSession.mutate(selectedSession)}
                            disabled={assignSession.isPending}
                          >
                            Accept Chat
                          </Button>
                        )}
                        {sessionDetails.status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => endSession.mutate(selectedSession)}
                            disabled={endSession.isPending}
                          >
                            End Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col h-[calc(100vh-380px)]">
                    {/* Messages */}
                    <ScrollArea className="flex-1 mb-4">
                      <div className="space-y-4 p-4">
                        {sessionDetails.messages.map((message, index) => (
                          <div
                            key={message.id}
                            className={`flex animate-fade-in ${
                              message.sender === 'agent' ? 'justify-end' : 'justify-start'
                            }`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg transition-all duration-200 hover-lift ${
                                message.sender === 'agent'
                                  ? 'bg-blue-600 text-white'
                                  : message.sender === 'system'
                                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                  : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                                <span>{message.senderName || message.sender}</span>
                                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <Separator className="mb-4" />

                    {/* Message Input */}
                    {sessionDetails.status === 'active' ? (
                      <form onSubmit={handleSendMessage} className="flex space-x-2">
                        <Input
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Type your message..."
                          disabled={sendMessage.isPending}
                          className="focus-ring"
                        />
                        <Button 
                          type="submit" 
                          disabled={sendMessage.isPending || !messageText.trim()}
                          className={`hover-scale hover-glow ${buttonStates['send-message'] ? 'animate-pulse' : ''}`}
                        >
                          {sendMessage.isPending ? (
                            <CircularProgress value={50} size={16} />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        {sessionDetails.status === 'waiting' 
                          ? 'Accept the chat to start messaging'
                          : 'This chat session has ended'
                        }
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 animate-fade-in">
                    <div className="animate-bounce-in">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Select a Chat Session</h3>
                    <p>Choose a chat session from the list to start messaging</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </main>
      </div>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}