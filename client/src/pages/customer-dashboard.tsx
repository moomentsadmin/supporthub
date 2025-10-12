import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useWhitelabelContext } from '@/components/whitelabel-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Calendar, 
  User, 
  Settings, 
  LogOut,
  Send,
  Plus,
  Ticket,
  Bot
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

export default function CustomerDashboard() {
  const { customer, isLoading: authLoading } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { config: whitelabelConfig } = useWhitelabelContext();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/customer/tickets'],
    enabled: !!customer,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/customer/tickets', selectedTicket?.id, 'messages'],
    enabled: !!selectedTicket,
  });

  const replyMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      return apiRequest('POST', `/api/customer/tickets/${data.ticketId}/reply`, { message: data.message });
    },
    onSuccess: () => {
      toast({
        title: 'Reply sent',
        description: 'Your message has been sent to the support team.',
      });
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/customer/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/tickets', selectedTicket?.id, 'messages'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send reply',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/customer/logout');
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation('/customer/login');
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!customer) {
    setLocation('/customer/login');
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReply = () => {
    if (replyMessage.trim() && selectedTicket) {
      replyMutation.mutate({
        ticketId: selectedTicket.id,
        message: replyMessage.trim(),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Support Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={(customer as any)?.avatar} />
                  <AvatarFallback>
                    {(customer as any)?.name ? (customer as any).name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {(customer as any)?.name || 'User'}
                </span>
              </div>
              <Button size="sm" onClick={() => setLocation('/customer/profile')}>
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tickets List */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Tickets
              </h2>
              <Button onClick={() => setLocation('/create-ticket')}>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>

            {ticketsLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <p>Loading tickets...</p>
                </CardContent>
              </Card>
            ) : !tickets || (Array.isArray(tickets) ? tickets.length === 0 : true) ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You don't have any tickets yet.
                  </p>
                  <Button onClick={() => setLocation('/create-ticket')}>
                    Create Your First Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Array.isArray(tickets) && tickets.map((ticket: any) => (
                  <Card 
                    key={ticket.id} 
                    className={`cursor-pointer hover:shadow-lg transition-shadow ${
                      selectedTicket?.id === ticket.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            #{ticket.ticketNumber}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span className="capitalize">{ticket.channel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Details & Messages */}
          <div>
            {selectedTicket ? (
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedTicket.subject}</span>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ticket #{selectedTicket.ticketNumber}
                  </p>
                </CardHeader>
                
                {/* Messages */}
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {messagesLoading ? (
                      <p>Loading messages...</p>
                    ) : !messages || (Array.isArray(messages) ? messages.length === 0 : true) ? (
                      <p className="text-gray-500 text-center">No messages yet</p>
                    ) : (
                      Array.isArray(messages) && messages.map((message: any) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isFromAgent ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.isFromAgent
                                ? 'bg-gray-100 dark:bg-gray-700'
                                : 'bg-blue-500 text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">
                                {message.senderName}
                              </span>
                              <span className="text-xs opacity-70">
                                {format(new Date(message.createdAt), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply Form */}
                  {selectedTicket.status !== 'closed' && (
                    <>
                      <Separator className="mb-4" />
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Type your reply..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          rows={3}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleReply}
                            disabled={!replyMessage.trim() || replyMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a ticket to view details and messages
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}