import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  Reply, 
  Forward,
  Clock, 
  User, 
  Code,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import type { Message } from "@shared/schema";

interface TicketEmailTrailProps {
  ticketId: string;
  className?: string;
}

interface EmailMessage extends Message {
  emailTo?: string;
  emailCc?: string;
  emailBcc?: string;
  isHtmlFormat?: boolean;
  htmlContent?: string;
}

export function TicketEmailTrail({ ticketId, className }: TicketEmailTrailProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [htmlViewMessages, setHtmlViewMessages] = useState<Set<string>>(new Set());

  const { data: messages = [], isLoading } = useQuery({
    queryKey: [`/api/tickets/${ticketId}/messages`],
    select: (data: EmailMessage[]) => data.filter(msg => 
      msg.sender === 'agent' || msg.sender === 'system' || msg.emailTo
    )
  });

  const toggleExpanded = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };

  const toggleHtmlView = (messageId: string) => {
    const newHtmlView = new Set(htmlViewMessages);
    if (newHtmlView.has(messageId)) {
      newHtmlView.delete(messageId);
    } else {
      newHtmlView.add(messageId);
    }
    setHtmlViewMessages(newHtmlView);
  };

  const getMessageType = (message: EmailMessage) => {
    if (message.sender === 'system') return 'system';
    if (message.emailTo) return 'email';
    return 'internal';
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'system': return <Forward className="w-4 h-4" />;
      default: return <Reply className="w-4 h-4" />;
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'system': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderEmailHeaders = (message: EmailMessage) => {
    if (!message.emailTo) return null;

    return (
      <div className="text-xs text-gray-500 space-y-1 mb-3 p-2 bg-gray-50 rounded">
        <div><strong>To:</strong> {message.emailTo}</div>
        {message.emailCc && <div><strong>CC:</strong> {message.emailCc}</div>}
        {message.emailBcc && <div><strong>BCC:</strong> {message.emailBcc}</div>}
      </div>
    );
  };

  const renderMessageContent = (message: EmailMessage) => {
    const isExpanded = expandedMessages.has(message.id);
    const showHtml = htmlViewMessages.has(message.id);
    const content = showHtml && message.htmlContent ? message.htmlContent : message.content;
    const isLongMessage = content.length > 300;

    return (
      <div className="space-y-2">
        {renderEmailHeaders(message)}
        
        <div className="space-y-2">
          {message.isHtmlFormat && message.htmlContent && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleHtmlView(message.id)}
                className="text-xs"
              >
                {showHtml ? (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    View Text
                  </>
                ) : (
                  <>
                    <Code className="w-3 h-3 mr-1" />
                    View HTML
                  </>
                )}
              </Button>
            </div>
          )}

          <div className={`${isLongMessage && !isExpanded ? 'max-h-20 overflow-hidden' : ''} transition-all duration-200`}>
            {showHtml && message.htmlContent ? (
              <div 
                className="prose prose-sm max-w-none bg-white p-3 rounded border"
                dangerouslySetInnerHTML={{ __html: message.htmlContent }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm text-gray-700">
                {content}
              </div>
            )}
          </div>

          {isLongMessage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(message.id)}
              className="text-xs w-full"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Show More
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No email communications yet</p>
            <p className="text-sm">Email replies and forwards will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Trail ({messages.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-4">
            {messages.map((message, index) => {
              const messageType = getMessageType(message);
              return (
                <div key={message.id} className="space-y-3">
                  <div className="border rounded-lg p-4 space-y-3">
                    {/* Message Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={`${getMessageTypeColor(messageType)} gap-1`}>
                          {getMessageTypeIcon(messageType)}
                          {messageType === 'email' ? 'Email Sent' : 
                           messageType === 'system' ? 'System' : 'Internal'}
                        </Badge>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{message.senderName}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(message.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Message Content */}
                    {renderMessageContent(message)}
                  </div>
                  
                  {/* Separator between messages */}
                  {index < messages.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}