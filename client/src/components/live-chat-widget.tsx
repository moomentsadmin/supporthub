import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2, 
  User,
  Bot,
  Clock
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
}

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startChatMutation = useMutation({
    mutationFn: async (data: typeof customerInfo) => {
      // Create a real chat session in the backend
      const response = await apiRequest("POST", "/api/public/chat/start", {
        name: data.name,
        email: data.email,
        message: data.message
      });
      
      const session = await response.json();
      setSessionId(session.id);
      setHasStartedChat(true);
      
      // Add initial system message
      const systemMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        content: "Thank you for contacting us! A support agent will be with you shortly. Your message: " + data.message,
        sender: 'system',
        senderName: 'Support System',
        timestamp: new Date().toISOString()
      };
      setMessages([systemMessage]);
      
      return session;
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      if (!sessionId) return;
      
      // Send message to backend using existing endpoint
      const response = await apiRequest("POST", "/api/public/chat/message", {
        sessionId: sessionId,
        content: data.content
      });
      
      const savedMessage = await response.json();
      
      const userMessage: ChatMessage = {
        id: savedMessage.id,
        content: data.content,
        sender: 'customer',
        senderName: customerInfo.name || 'You',
        timestamp: savedMessage.createdAt || new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setMessage("");
      
      return userMessage;
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.email || !customerInfo.message) {
      return;
    }
    startChatMutation.mutate(customerInfo);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    sendMessageMutation.mutate({
      content: message.trim()
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Waiting for agent';
      case 'active': return 'Chat active';
      case 'ended': return 'Chat ended';
      default: return status;
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-80 transition-all duration-300 shadow-xl ${isMinimized ? 'h-14' : 'h-96'}`}>
        <CardHeader className="p-3 bg-blue-600 text-white rounded-t-lg flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {hasStartedChat ? 'Live Chat' : 'Start Chat'}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {hasStartedChat && (
              <Badge className="bg-green-100 text-green-800">
                Chat Active
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-blue-700 p-1"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700 p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="p-0 h-80 flex flex-col">
            {!hasStartedChat ? (
              // Initial form
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Start a conversation with our support team
                </p>
                <form onSubmit={handleStartChat} className="space-y-3">
                  <Input
                    placeholder="Your name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    required
                  />
                  <textarea
                    className="w-full p-2 border rounded-md text-sm resize-none"
                    placeholder="How can we help you?"
                    rows={3}
                    value={customerInfo.message}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, message: e.target.value })}
                    required
                  />
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={startChatMutation.isPending}
                  >
                    {startChatMutation.isPending ? "Starting..." : "Start Chat"}
                  </Button>
                </form>
              </div>
            ) : (
              // Chat interface
              <>
                {/* Messages area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.sender === 'customer'
                              ? 'bg-blue-600 text-white'
                              : msg.sender === 'system'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            {msg.sender === 'customer' ? (
                              <User className="w-3 h-3" />
                            ) : msg.sender === 'system' ? (
                              <Bot className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            <span className="text-xs opacity-70">
                              {msg.senderName || msg.sender}
                            </span>
                            <Clock className="w-3 h-3 opacity-50" />
                            <span className="text-xs opacity-50">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message input */}
                <div className="p-3 border-t">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      placeholder="Type your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={!message.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}