import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Send, 
  Mail, 
  Code, 
  Eye, 
  Plus, 
  X, 
  Image as ImageIcon,
  FileText,
  Users,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Agent, Ticket } from "@shared/schema";
import "./ui/rich-text-editor.css";

interface EnhancedEmailReplyProps {
  ticket: Ticket;
  onReply: () => void;
  className?: string;
}

export function EnhancedEmailReply({ ticket, onReply, className }: EnhancedEmailReplyProps) {
  const [replyMessage, setReplyMessage] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [emailTo, setEmailTo] = useState(ticket.customerContact);
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [newCc, setNewCc] = useState("");
  const [newBcc, setNewBcc] = useState("");
  const [useSignature, setUseSignature] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const htmlContentRef = useRef<HTMLDivElement>(null);

  // Initialize editor content
  useEffect(() => {
    if (htmlContentRef.current && !htmlContent) {
      htmlContentRef.current.innerHTML = '<p><br></p>';
      htmlContentRef.current.focus();
    }
  }, []);

  // Get current agent data
  const { data: agentResponse } = useQuery<{ agent: Agent }>({
    queryKey: ['/api/auth/me']
  });
  const agent = agentResponse?.agent;

  // Get available templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['/api/agents/templates']
  });

  // Get other agents for CC suggestions
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/admin/agents']
  });

  const replyMutation = useMutation({
    mutationFn: (replyData: {
      content: string;
      htmlContent?: string;
      isHtmlFormat: boolean;
      sendEmail: boolean;
      emailTo?: string;
      emailCc?: string;
      emailBcc?: string;
      useSignature: boolean;
    }) => apiRequest("POST", `/api/tickets/${ticket.id}/reply`, replyData),
    onSuccess: () => {
      toast({
        title: "Reply Sent",
        description: sendEmail ? "Reply sent via email successfully!" : "Reply saved to ticket history!",
      });
      // Clear form
      setHtmlContent("");
      if (htmlContentRef.current) {
        htmlContentRef.current.innerHTML = '<p><br></p>';
      }
      setEmailCc("");
      setEmailBcc("");
      setCcRecipients([]);
      setBccRecipients([]);
      onReply();
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticket.id}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!htmlContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a reply message.",
        variant: "destructive",
      });
      return;
    }

    const allCc = [...ccRecipients, ...emailCc.split(',').filter(e => e.trim())].join(', ');
    const allBcc = [...bccRecipients, ...emailBcc.split(',').filter(e => e.trim())].join(', ');

    replyMutation.mutate({
      content: htmlContent,
      htmlContent: htmlContent,
      isHtmlFormat: true,
      sendEmail,
      emailTo,
      emailCc: allCc || undefined,
      emailBcc: allBcc || undefined,
      useSignature
    });
  };

  const addCcRecipient = () => {
    if (newCc.trim() && !ccRecipients.includes(newCc.trim())) {
      setCcRecipients([...ccRecipients, newCc.trim()]);
      setNewCc("");
    }
  };

  const addBccRecipient = () => {
    if (newBcc.trim() && !bccRecipients.includes(newBcc.trim())) {
      setBccRecipients([...bccRecipients, newBcc.trim()]);
      setNewBcc("");
    }
  };

  const removeCcRecipient = (email: string) => {
    setCcRecipients(ccRecipients.filter(e => e !== email));
  };

  const removeBccRecipient = (email: string) => {
    setBccRecipients(bccRecipients.filter(e => e !== email));
  };

  const insertTemplate = (templateContent: string) => {
    setHtmlContent(prev => prev + '<br>' + templateContent);
  };

  const generatePreview = () => {
    let content = htmlContent;
    
    if (useSignature && agent?.signature) {
      // Convert newlines to <br> tags for proper HTML formatting
      const formattedSignature = agent.signature.replace(/\n/g, '<br>');
      content += '<br><br>' + formattedSignature;
    }
    
    return content;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Reply to Ticket
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Recipients */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emailTo" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  To
                </Label>
                <Input
                  id="emailTo"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* CC Recipients */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                CC Recipients
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newCc}
                  onChange={(e) => setNewCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 font-mono text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCcRecipient())}
                />
                <Select onValueChange={(value) => {setNewCc(value); addCcRecipient();}}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Add Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.filter((a: Agent) => a.id !== agent?.id).map((a: Agent) => (
                      <SelectItem key={a.id} value={a.email}>
                        {a.name} ({a.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addCcRecipient} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {ccRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ccRecipients.map((email, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {email}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeCcRecipient(email)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* BCC Recipients */}
            <div className="space-y-2">
              <Label>BCC Recipients (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newBcc}
                  onChange={(e) => setNewBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 font-mono text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBccRecipient())}
                />
                <Button type="button" onClick={addBccRecipient} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {bccRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {bccRecipients.map((email, index) => (
                    <Badge key={index} variant="outline" className="gap-1">
                      {email}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeBccRecipient(email)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Rich Text Reply Message</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {isPreviewMode ? 'Edit' : 'Preview'}
                </Button>
              </div>
            </div>

            {/* Template Selector */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Quick Templates</Label>
                <div className="flex gap-2">
                  <Select onValueChange={(value) => {
                    const template = templates.find((t: any) => t.id === value);
                    if (template) insertTemplate(template.content);
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Insert template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {!isPreviewMode ? (
              <div className="space-y-4">
                <div className="space-y-4">
                  <Label>Rich Text Editor</Label>
                    <div className="border rounded-md">
                      <div className="border-b p-2 bg-muted/50">
                        <div className="flex flex-wrap gap-1">
                          {/* Text Formatting */}
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => document.execCommand('bold', false)}
                            title="Bold (Ctrl+B)"
                          >
                            <Bold className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => document.execCommand('italic', false)}
                            title="Italic (Ctrl+I)"
                          >
                            <Italic className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => document.execCommand('underline', false)}
                            title="Underline (Ctrl+U)"
                          >
                            <Underline className="w-4 h-4" />
                          </Button>
                          
                          <div className="w-px h-6 bg-border mx-1" />
                          
                          {/* Lists */}
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => document.execCommand('insertUnorderedList', false)}
                            title="Bullet List"
                          >
                            <List className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => document.execCommand('insertOrderedList', false)}
                            title="Numbered List"
                          >
                            <ListOrdered className="w-4 h-4" />
                          </Button>
                          
                          <div className="w-px h-6 bg-border mx-1" />
                          
                          {/* Alignment */}
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => document.execCommand('justifyLeft', false)}
                            title="Align Left"
                          >
                            <AlignLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => document.execCommand('justifyCenter', false)}
                            title="Align Center"
                          >
                            <AlignCenter className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => document.execCommand('justifyRight', false)}
                            title="Align Right"
                          >
                            <AlignRight className="w-4 h-4" />
                          </Button>
                          
                          <div className="w-px h-6 bg-border mx-1" />
                          
                          {/* Additional formatting */}
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => {
                              const url = prompt('Enter link URL:');
                              if (url) document.execCommand('createLink', false, url);
                            }}
                            title="Insert Link"
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                          <Select onValueChange={(value) => document.execCommand('formatBlock', false, value)}>
                            <SelectTrigger className="w-20 h-8 text-xs">
                              <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="p">Normal</SelectItem>
                              <SelectItem value="h1">Heading 1</SelectItem>
                              <SelectItem value="h2">Heading 2</SelectItem>
                              <SelectItem value="h3">Heading 3</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div
                        ref={htmlContentRef}
                        contentEditable
                        className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none bg-white border-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-b-md"
                        style={{ 
                          lineHeight: '1.6',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          direction: 'ltr',
                          textAlign: 'left',
                          unicodeBidi: 'embed'
                        }}
                        onInput={() => {
                          if (htmlContentRef.current) {
                            setHtmlContent(htmlContentRef.current.innerHTML);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Add keyboard shortcuts
                          if (e.ctrlKey || e.metaKey) {
                            switch (e.key) {
                              case 'b':
                                e.preventDefault();
                                document.execCommand('bold', false);
                                break;
                              case 'i':
                                e.preventDefault();
                                document.execCommand('italic', false);
                                break;
                              case 'u':
                                e.preventDefault();
                                document.execCommand('underline', false);
                                break;
                            }
                          }
                        }}
                        suppressContentEditableWarning={true}
                        data-placeholder="Start typing your rich text message here..."
                      />
                    </div>
                  </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 min-h-[200px] bg-white">
                <div className="mb-4 text-sm text-gray-500 border-b pb-2">
                  Email Preview
                </div>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: generatePreview() }}
                />
              </div>
            )}
          </div>

          {/* Email Options */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="send-email" 
                  checked={sendEmail} 
                  onCheckedChange={setSendEmail}
                />
                <Label htmlFor="send-email">Send via Email</Label>
              </div>
              
              {agent?.signature && (
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="use-signature" 
                    checked={useSignature} 
                    onCheckedChange={setUseSignature}
                  />
                  <Label htmlFor="use-signature">Include Signature</Label>
                </div>
              )}
            </div>

            {useSignature && agent && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-sm font-medium text-blue-800">Signature that will be included:</p>
                </div>
                <div className="bg-white p-3 rounded border border-blue-100">
                  {agent?.signature ? (
                    <div 
                      className="text-sm"
                      dangerouslySetInnerHTML={{ __html: agent.signature.replace(/\n/g, '<br>') }}
                    />
                  ) : (
                    <div className="text-sm text-gray-600 italic">
                      <p>Best regards,</p>
                      <p><strong>{agent?.name || 'Agent'}</strong><br/>
                      Customer Support Agent<br/>
                      <a href={`mailto:${agent?.email}`}>{agent?.email}</a></p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              type="submit" 
              disabled={replyMutation.isPending}
              className="min-w-[140px]"
            >
              {replyMutation.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reply
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}