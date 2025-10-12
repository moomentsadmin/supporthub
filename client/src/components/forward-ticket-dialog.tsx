import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Forward, Mail, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Agent } from "@shared/schema";

interface ForwardTicketDialogProps {
  ticketId: string;
  ticketNumber: string;
  ticketSubject: string;
  trigger?: React.ReactNode;
}

export function ForwardTicketDialog({ 
  ticketId, 
  ticketNumber, 
  ticketSubject,
  trigger 
}: ForwardTicketDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCc, setNewCc] = useState("");
  const [forwardMessage, setForwardMessage] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available agents
  const { data: agents = [] } = useQuery({
    queryKey: ['/api/admin/agents']
  });

  const forwardMutation = useMutation({
    mutationFn: async (forwardData: {
      forwardTo: string;
      ccEmails: string[];
      message: string;
      assignToAgent?: string;
    }) => {
      return apiRequest(`/api/tickets/${ticketId}/forward`, {
        method: 'POST',
        body: JSON.stringify(forwardData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket Forwarded",
        description: `Ticket #${ticketNumber} has been forwarded successfully.`,
      });
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
    },
    onError: () => {
      toast({
        title: "Forward Failed",
        description: "Failed to forward the ticket. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setForwardTo("");
    setCcEmails([]);
    setNewCc("");
    setForwardMessage("");
    setSelectedAgent("");
  };

  const addCcEmail = () => {
    if (newCc.trim() && !ccEmails.includes(newCc.trim())) {
      setCcEmails([...ccEmails, newCc.trim()]);
      setNewCc("");
    }
  };

  const removeCcEmail = (email: string) => {
    setCcEmails(ccEmails.filter(e => e !== email));
  };

  const handleAgentSelect = (agentId: string) => {
    const agent = agents.find((a: Agent) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agentId);
      setForwardTo(agent.email);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forwardTo.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an email address to forward to.",
        variant: "destructive",
      });
      return;
    }

    forwardMutation.mutate({
      forwardTo: forwardTo.trim(),
      ccEmails,
      message: forwardMessage,
      assignToAgent: selectedAgent || undefined
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Forward className="w-4 h-4 mr-2" />
            Forward Ticket
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="w-5 h-5" />
            Forward Ticket #{ticketNumber}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ticket Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Ticket Details</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Subject:</strong> {ticketSubject}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Ticket ID:</strong> #{ticketNumber}
            </p>
          </div>

          {/* Forward To */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forward-to">Forward To *</Label>
              <div className="flex gap-2">
                <Input
                  id="forward-to"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1"
                />
                <Select onValueChange={handleAgentSelect}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent: Agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter email address or select an agent to forward to
              </p>
            </div>

            {/* CC Recipients */}
            <div className="space-y-2">
              <Label>CC Recipients (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newCc}
                  onChange={(e) => setNewCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCcEmail())}
                />
                <Button type="button" onClick={addCcEmail} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ccEmails.map((email, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {email}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeCcEmail(email)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Forward Message */}
          <div className="space-y-2">
            <Label htmlFor="forward-message">Message (Optional)</Label>
            <Textarea
              id="forward-message"
              value={forwardMessage}
              onChange={(e) => setForwardMessage(e.target.value)}
              placeholder="Add a message to include with the forwarded ticket..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              This message will be included in the forwarded email along with the complete ticket history.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={forwardMutation.isPending}
            >
              <Mail className="w-4 h-4 mr-2" />
              {forwardMutation.isPending ? "Forwarding..." : "Forward Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}