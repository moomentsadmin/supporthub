import { useState, useEffect, useRef } from "react";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'customer' | 'agent' | 'system';
  timestamp: string;
  senderName?: string;
}

interface EmbeddableChatWidgetProps {
  apiBaseUrl: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  companyName?: string;
}

export default function EmbeddableChatWidget({ 
  apiBaseUrl, 
  primaryColor = '#3b82f6',
  position = 'bottom-right',
  companyName = 'Support'
}: EmbeddableChatWidgetProps) {
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
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.email || !customerInfo.message) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/public/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customerInfo.name,
          email: customerInfo.email,
          message: customerInfo.message,
          websiteUrl: window.location.href
        }),
      });

      if (response.ok) {
        const session = await response.json();
        setSessionId(session.id);
        setHasStartedChat(true);
        
        // Add initial system message
        const systemMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          content: `Welcome to ${companyName} support! Your message has been received and an agent will be with you shortly.`,
          sender: 'system',
          senderName: 'Support System',
          timestamp: new Date().toISOString()
        };
        setMessages([systemMessage]);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !sessionId) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: message.trim(),
      sender: 'customer',
      senderName: customerInfo.name || 'You',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const messageContent = message.trim();
    setMessage("");

    try {
      await fetch(`${apiBaseUrl}/api/public/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          content: messageContent
        }),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const positionClass = position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4';

  if (!isOpen) {
    return (
      <div className={`fixed ${positionClass} z-50`}>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg text-white font-semibold transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor }}
        >
          💬
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClass} z-50`}>
      <div 
        className={`w-80 bg-white rounded-lg shadow-xl border transition-all duration-300 ${
          isMinimized ? 'h-14' : 'h-96'
        }`}
      >
        {/* Header */}
        <div 
          className="p-3 text-white rounded-t-lg flex items-center justify-between"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="text-sm font-medium">
            {hasStartedChat ? `${companyName} Chat` : `Contact ${companyName}`}
          </div>
          <div className="flex items-center space-x-2">
            {hasStartedChat && (
              <span className="text-xs bg-green-400 px-2 py-1 rounded-full">
                Active
              </span>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-black hover:bg-opacity-20 p-1 rounded"
            >
              {isMinimized ? '□' : '−'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-black hover:bg-opacity-20 p-1 rounded"
            >
              ×
            </button>
          </div>
        </div>
        
        {!isMinimized && (
          <div className="h-80 flex flex-col">
            {!hasStartedChat ? (
              // Initial form
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Start a conversation with our support team
                </p>
                <form onSubmit={handleStartChat} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full p-2 border rounded-md text-sm"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    className="w-full p-2 border rounded-md text-sm"
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
                  <button 
                    type="submit" 
                    className="w-full p-2 text-white rounded-md text-sm font-medium transition-colors"
                    style={{ backgroundColor: primaryColor }}
                    disabled={isLoading}
                  >
                    {isLoading ? "Starting..." : "Start Chat"}
                  </button>
                </form>
              </div>
            ) : (
              // Chat interface
              <>
                {/* Messages area */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg text-sm ${
                            msg.sender === 'customer'
                              ? 'text-white'
                              : msg.sender === 'system'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                          style={msg.sender === 'customer' ? { backgroundColor: primaryColor } : {}}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs opacity-70">
                              {msg.senderName || msg.sender}
                            </span>
                            <span className="text-xs opacity-50">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message input */}
                <div className="p-3 border-t">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 p-2 border rounded-md text-sm"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button 
                      type="submit" 
                      className="p-2 text-white rounded-md text-sm transition-colors"
                      style={{ backgroundColor: primaryColor }}
                      disabled={!message.trim()}
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Global function to initialize the widget on external websites
declare global {
  interface Window {
    SupportHubChat: {
      init: (config: {
        apiBaseUrl: string;
        primaryColor?: string;
        position?: 'bottom-right' | 'bottom-left';
        companyName?: string;
      }) => void;
    };
  }
}

// Auto-initialization if config is provided via data attributes
if (typeof window !== 'undefined') {
  window.SupportHubChat = {
    init: (config) => {
      const container = document.createElement('div');
      container.id = 'supporthub-chat-widget';
      document.body.appendChild(container);
      
      // Here you would render the React component
      // This is a simplified version - in reality you'd need to set up React rendering
      console.log('SupportHub Chat Widget initialized with config:', config);
    }
  };
}