import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Search, Calendar, User, MessageSquare, Bot } from 'lucide-react';
import { useWhitelabelContext } from '@/components/whitelabel-provider';
import { format } from 'date-fns';

export default function TrackTicket() {
  const [email, setEmail] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const { toast } = useToast();
  const { config: whitelabelConfig } = useWhitelabelContext();

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ['/api/public/tickets/search', email],
    enabled: searchTriggered && email.length > 0,
  });

  // Type guard for tickets
  const ticketsArray = Array.isArray(tickets) ? tickets : [];

  // Customer reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      return apiRequest('POST', `/api/public/tickets/${ticketId}/reply`, { message });
    },
    onSuccess: () => {
      toast({
        title: "Reply sent!",
        description: "Your message has been sent to the support team.",
      });
      setSelectedTicket(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCustomerReply = (ticketId: string, message: string) => {
    replyMutation.mutate({ ticketId, message });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSearchTriggered(true);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Track Your Support Tickets
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email address to view the status of your support requests
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-8 border-red-200">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                Error searching tickets. Please try again.
              </p>
            </CardContent>
          </Card>
        )}

        {searchTriggered && ticketsArray && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Found {ticketsArray.length} ticket{ticketsArray.length !== 1 ? 's' : ''}
            </h2>
            
            {ticketsArray.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No tickets found for this email address.
                  </p>
                </CardContent>
              </Card>
            ) : (
              ticketsArray.map((ticket: any) => (
                <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Ticket #{ticket.ticketNumber}
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
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {ticket.description}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{ticket.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="capitalize">{ticket.channel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="flex-1"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Reply to Ticket
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Ticket Reply Modal */}
        {selectedTicket && (
          <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Reply to Ticket #{selectedTicket.ticketNumber}</DialogTitle>
                <DialogDescription>{selectedTicket.subject}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="flex gap-2">
                  <Badge className={getStatusColor(selectedTicket.status)}>
                    {selectedTicket.status}
                  </Badge>
                  <Badge className={getPriorityColor(selectedTicket.priority)}>
                    {selectedTicket.priority}
                  </Badge>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Original Message</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedTicket.description}</p>
                </div>
                
                {/* Customer Reply Form */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4">Send a Reply</h4>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const message = formData.get('message') as string;
                    if (message?.trim()) {
                      handleCustomerReply(selectedTicket.id, message.trim());
                    }
                  }}>
                    <div className="space-y-4">
                      <Textarea
                        name="message"
                        placeholder="Type your reply here..."
                        rows={4}
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setSelectedTicket(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={replyMutation.isPending}
                        >
                          {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Customer Login Call-to-Action */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Need to manage your tickets?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Login to your customer portal to view all tickets, reply to messages, and track progress.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.location.href = "/customer/login"} className="bg-blue-600 hover:bg-blue-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Customer Login
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => window.location.href = "/customer/register"}
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}