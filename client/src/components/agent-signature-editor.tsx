import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, 
  Eye, 
  Code, 
  Image as ImageIcon,
  User,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AgentSignatureEditorProps {
  agentId?: string;
  className?: string;
}

export function AgentSignatureEditor({ agentId, className }: AgentSignatureEditorProps) {
  const [signature, setSignature] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current agent data
  const { data: agent } = useQuery<any>({
    queryKey: agentId ? [`/api/agents/${agentId}`] : ['/api/auth/me']
  });

  useEffect(() => {
    if (agent) {
      setSignature(agent.signature || getDefaultSignature(agent));
      setSignatureImage(agent.signatureImage || "");
    }
  }, [agent]);

  const getDefaultSignature = (agentData: any) => {
    return `<div style="font-family: Arial, sans-serif; color: #333;">
  <p>Best regards,</p>
  <p><strong>${agentData.name}</strong><br>
  Customer Support Agent<br>
  <a href="mailto:${agentData.email}">${agentData.email}</a></p>
  ${signatureImage ? `<img src="${signatureImage}" alt="Company Logo" style="max-width: 150px; margin-top: 10px;">` : ''}
</div>`;
  };

  const signatureMutation = useMutation({
    mutationFn: (data: { signature: string; signatureImage?: string }) => {
      const endpoint = agentId ? `/api/agents/${agentId}/signature` : '/api/agents/signature';
      return apiRequest("PUT", endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Signature Updated",
        description: "Your email signature has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: agentId ? [`/api/agents/${agentId}`] : ['/api/auth/me'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update signature. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signatureMutation.mutate({ 
      signature,
      signatureImage 
    });
  };

  const insertTemplate = (template: string) => {
    setSignature(prev => prev + template);
  };

  const signatureTemplates = [
    {
      name: "Basic Professional",
      content: `<div style="font-family: Arial, sans-serif; color: #333;">
  <p>Best regards,</p>
  <p><strong>${agent?.name || '[Your Name]'}</strong><br>
  Customer Support Agent<br>
  <a href="mailto:${agent?.email || '[Your Email]'}">${agent?.email || '[Your Email]'}</a></p>
</div>`
    },
    {
      name: "With Company Logo",
      content: `<div style="font-family: Arial, sans-serif; color: #333;">
  <p>Best regards,</p>
  <p><strong>${agent?.name || '[Your Name]'}</strong><br>
  Customer Support Agent<br>
  <a href="mailto:${agent?.email || '[Your Email]'}">${agent?.email || '[Your Email]'}</a></p>
  <img src="${signatureImage || '[Logo URL]'}" alt="Company Logo" style="max-width: 150px; margin-top: 10px;">
</div>`
    },
    {
      name: "Detailed Contact",
      content: `<table style="font-family: Arial, sans-serif; color: #333;">
  <tr>
    <td style="padding-right: 20px; border-right: 2px solid #0066cc;">
      <p><strong>${agent?.name || '[Your Name]'}</strong><br>
      Customer Support Agent</p>
      <p>📧 <a href="mailto:${agent?.email || '[Your Email]'}">${agent?.email || '[Your Email]'}</a><br>
      📞 [Phone Number]<br>
      🌐 [Company Website]</p>
    </td>
    <td style="padding-left: 20px;">
      ${signatureImage ? `<img src="${signatureImage}" alt="Company Logo" style="max-width: 120px;">` : '[Company Logo]'}
    </td>
  </tr>
</table>`
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Email Signature
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="signature-image" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Company Logo URL (Optional)
            </Label>
            <Input
              id="signature-image"
              value={signatureImage}
              onChange={(e) => setSignatureImage(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            {signatureImage && (
              <div className="mt-2">
                <img 
                  src={signatureImage} 
                  alt="Logo preview" 
                  className="max-w-[150px] max-h-[80px] border rounded"
                  onError={() => toast({
                    title: "Invalid Image URL",
                    description: "The logo URL appears to be invalid.",
                    variant: "destructive"
                  })}
                />
              </div>
            )}
          </div>

          {/* Signature Templates */}
          <div className="space-y-2">
            <Label>Quick Templates</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {signatureTemplates.map((template, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSignature(template.content)}
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Signature Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Email Signature</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="html-mode"
                    checked={isHtmlMode}
                    onCheckedChange={setIsHtmlMode}
                  />
                  <Label htmlFor="html-mode" className="text-sm flex items-center gap-1">
                    <Code className="w-4 h-4" />
                    HTML Mode
                  </Label>
                </div>
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

            {!isPreviewMode ? (
              <div className="space-y-2">
                {isHtmlMode ? (
                  <Textarea
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="<div>Enter your HTML signature here...</div>"
                    rows={10}
                    className="font-mono text-sm"
                  />
                ) : (
                  <Textarea
                    value={signature.replace(/<[^>]*>/g, '')}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Enter your signature in plain text..."
                    rows={6}
                  />
                )}
                <p className="text-xs text-gray-500">
                  {isHtmlMode 
                    ? "HTML mode: Use tags like <strong>, <a>, <img> for formatting"
                    : "Plain text mode: HTML tags will be displayed as text"
                  }
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 min-h-[200px] bg-white">
                <div className="mb-4 text-sm text-gray-500 border-b pb-2">
                  Signature Preview
                </div>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: signature }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={signatureMutation.isPending}
            >
              {signatureMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Signature
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}