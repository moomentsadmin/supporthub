import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/file-upload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Send, X } from "lucide-react";
import type { Ticket, Template } from "@shared/schema";

interface ResponseModalProps {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
}

export default function ResponseModal({ ticket, open, onClose }: ResponseModalProps) {
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [closeAfterSending, setCloseAfterSending] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    enabled: open,
  });

  const sendResponseMutation = useMutation({
    mutationFn: async () => {
      if (!ticket) throw new Error("No ticket selected");
      
      // Send the reply using the correct endpoint
      const status = closeAfterSending ? "closed" : newStatus || ticket.status;
      await apiRequest("POST", `/api/tickets/${ticket.id}/reply`, {
        message,
        status: newStatus || (closeAfterSending ? "closed" : undefined),
        sendEmail: true,
        attachments: files.map(f => f.name), // In real app, would upload files first
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/tickets", ticket?.id, "messages"] });
      toast({
        title: "Response sent",
        description: "Your response has been sent to the customer.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Failed to send response",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const handleClose = () => {
    setMessage("");
    setSelectedTemplate("");
    setCloseAfterSending(false);
    setNewStatus("");
    setFiles([]);
    onClose();
  };

  const handleSend = () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a response message.",
        variant: "destructive",
      });
      return;
    }
    sendResponseMutation.mutate();
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reply to Ticket {ticket.ticketNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Response Templates */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Quick Response Templates
            </Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Response Text Area */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Response Message
            </Label>
            <Textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your response here..."
              className="resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Attachments
            </Label>
            <FileUpload 
              files={files} 
              onFilesChange={setFiles}
              maxFiles={5}
            />
          </div>

          {/* Response Actions */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="close-after-sending"
                    checked={closeAfterSending}
                    onCheckedChange={(checked) => setCloseAfterSending(checked === true)}
                  />
                  <Label htmlFor="close-after-sending" className="text-sm text-gray-600">
                    Close ticket after sending
                  </Label>
                </div>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Keep current status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Keep current status</SelectItem>
                    <SelectItem value="in-progress">Mark as in progress</SelectItem>
                    <SelectItem value="resolved">Mark as resolved</SelectItem>
                    <SelectItem value="closed">Mark as closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSend}
                  disabled={sendResponseMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-1" />
                  {sendResponseMutation.isPending ? "Sending..." : "Send Response"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
