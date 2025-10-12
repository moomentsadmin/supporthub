import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveChatMessage } from "@shared/schema";

interface ChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  websiteUrl?: string;
}

export default function ChatWidget({ 
  position = 'bottom-right',
  primaryColor = '#3b82f6',
  websiteUrl = window.location.origin
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [visitorName, setVisitorName] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeChatSession();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChatSession = async () => {
    try {
      // Create new chat session
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl,
          userAgent: navigator.userAgent,
          visitorId: generateVisitorId()
        })
      });
      
      const session = await response.json();
      setSessionId(session.id);
      
      // Initialize WebSocket connection
      initializeWebSocket(session.id);
    } catch (error) {
      console.error('Failed to initialize chat session:', error);
    }
  };

  const initializeWebSocket = (sessionId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?sessionId=${sessionId}`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      // Send welcome message
      addMessage({
        sessionId,
        message: "Hello! How can we help you today?",
        sender: 'agent',
        timestamp: new Date(),
        senderName: "Support Team"
      });
    };
    
    wsRef.current.onmessage = (event) => {
      const message: LiveChatMessage = JSON.parse(event.data);
      addMessage(message);
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
    };
  };

  const generateVisitorId = () => {
    return `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addMessage = (message: LiveChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || !isConnected) return;

    const message: LiveChatMessage = {
      sessionId,
      message: inputMessage.trim(),
      sender: 'visitor',
      timestamp: new Date(),
      senderName: visitorName || 'You'
    };

    wsRef.current.send(JSON.stringify(message));
    addMessage(message);
    setInputMessage("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div 
        className={cn(
          "fixed z-50 cursor-pointer transition-transform hover:scale-110",
          position === 'bottom-right' ? "bottom-4 right-4" : "bottom-4 left-4"
        )}
        onClick={() => setIsOpen(true)}
      >
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="w-6 h-6" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "fixed z-50 w-80 h-96 transition-all duration-300",
        position === 'bottom-right' ? "bottom-4 right-4" : "bottom-4 left-4",
        isMinimized && "h-12"
      )}
    >
      <Card className="h-full flex flex-col shadow-xl">
        <CardHeader 
          className="p-4 cursor-pointer"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/support-avatar.png" />
                <AvatarFallback>S</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm">Live Support</CardTitle>
                <p className="text-xs opacity-90">
                  {isConnected ? 'Online' : 'Connecting...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  wsRef.current?.close();
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.sender === 'visitor' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] p-3 rounded-lg text-sm",
                        message.sender === 'visitor'
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      )}
                    >
                      <p>{message.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={!isConnected}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || !isConnected}
                  size="sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}