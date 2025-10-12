import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminLayout from "@/components/admin-layout";
import { 
  Code, 
  Copy, 
  Settings, 
  Eye, 
  Palette,
  Monitor,
  CheckCircle,
  ExternalLink,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWhitelabelContext } from "@/components/whitelabel-provider";

export default function WidgetIntegration() {
  const { toast } = useToast();
  const { config: whitelabelConfig } = useWhitelabelContext();
  const [widgetConfig, setWidgetConfig] = useState({
    primaryColor: whitelabelConfig?.primaryColor || '#3b82f6',
    position: 'bottom-right' as 'bottom-right' | 'bottom-left',
    companyName: whitelabelConfig?.companyName || 'Support',
    customDomain: whitelabelConfig?.customDomain || ''
  });

  const baseUrl = widgetConfig.customDomain || window.location.origin;

  // Generate embed codes
  const scriptEmbed = `<!-- SupportHub Chat Widget -->
<script 
  src="${baseUrl}/widget.js"
  data-supporthub-api="${baseUrl}"
  data-supporthub-color="${widgetConfig.primaryColor}"
  data-supporthub-position="${widgetConfig.position}"
  data-supporthub-company="${widgetConfig.companyName}">
</script>`;

  const htmlEmbed = `<!-- SupportHub Chat Widget - Manual Integration -->
<script src="${baseUrl}/widget.js"></script>
<script>
  SupportHubChat.init({
    apiBaseUrl: '${baseUrl}',
    primaryColor: '${widgetConfig.primaryColor}',
    position: '${widgetConfig.position}',
    companyName: '${widgetConfig.companyName}'
  });
</script>`;

  const reactEmbed = `// React Component Integration
import { useEffect } from 'react';

function ChatWidget() {
  useEffect(() => {
    // Load SupportHub Chat Widget
    const script = document.createElement('script');
    script.src = '${baseUrl}/widget.js';
    script.onload = () => {
      window.SupportHubChat.init({
        apiBaseUrl: '${baseUrl}',
        primaryColor: '${widgetConfig.primaryColor}',
        position: '${widgetConfig.position}',
        companyName: '${widgetConfig.companyName}'
      });
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src*="widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null; // Widget renders itself
}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${label} code has been copied to your clipboard`,
      });
    });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "File downloaded",
      description: `${filename} has been downloaded to your device`,
    });
  };

  return (
    <AdminLayout title="Widget Integration">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Widget Integration</h2>
          <p className="mt-2 text-gray-600">
            Embed the customer support chat widget on your website
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Widget Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={widgetConfig.primaryColor}
                      onChange={(e) => setWidgetConfig({...widgetConfig, primaryColor: e.target.value})}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={widgetConfig.primaryColor}
                      onChange={(e) => setWidgetConfig({...widgetConfig, primaryColor: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="position">Widget Position</Label>
                  <select
                    id="position"
                    value={widgetConfig.position}
                    onChange={(e) => setWidgetConfig({...widgetConfig, position: e.target.value as 'bottom-right' | 'bottom-left'})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={widgetConfig.companyName}
                    onChange={(e) => setWidgetConfig({...widgetConfig, companyName: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
                  <Input
                    id="customDomain"
                    value={widgetConfig.customDomain}
                    onChange={(e) => setWidgetConfig({...widgetConfig, customDomain: e.target.value})}
                    placeholder="https://support.yoursite.com"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integration Codes */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="simple" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="simple">Simple Embed</TabsTrigger>
                <TabsTrigger value="manual">Manual Setup</TabsTrigger>
                <TabsTrigger value="react">React Component</TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Simple Script Embed
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Add this single script tag to your website's HTML
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                        <code>{scriptEmbed}</code>
                      </pre>
                      <div className="absolute top-2 right-2 space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(scriptEmbed, 'Simple embed')}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(scriptEmbed, 'widget-embed.html')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Manual JavaScript Setup
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      For more control over widget initialization
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                        <code>{htmlEmbed}</code>
                      </pre>
                      <div className="absolute top-2 right-2 space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(htmlEmbed, 'Manual setup')}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(htmlEmbed, 'widget-manual.html')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="react" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      React Component
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Integration for React applications
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                        <code>{reactEmbed}</code>
                      </pre>
                      <div className="absolute top-2 right-2 space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(reactEmbed, 'React component')}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(reactEmbed, 'ChatWidget.jsx')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Preview and Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Widget Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg p-8 relative min-h-48">
                <p className="text-gray-500 text-center">Widget preview area</p>
                <div 
                  className={`absolute ${widgetConfig.position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'}`}
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer"
                    style={{ backgroundColor: widgetConfig.primaryColor }}
                  >
                    <Monitor className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Installation Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Badge variant="outline" className="mt-1">1</Badge>
                  <p className="text-sm">Copy one of the embed codes above</p>
                </div>
                <div className="flex items-start space-x-3">
                  <Badge variant="outline" className="mt-1">2</Badge>
                  <p className="text-sm">Paste it into your website's HTML, preferably before the closing &lt;/body&gt; tag</p>
                </div>
                <div className="flex items-start space-x-3">
                  <Badge variant="outline" className="mt-1">3</Badge>
                  <p className="text-sm">The widget will automatically appear on your website</p>
                </div>
                <div className="flex items-start space-x-3">
                  <Badge variant="outline" className="mt-1">4</Badge>
                  <p className="text-sm">Customers can click the widget to start conversations</p>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  The widget is responsive and will adapt to your website's design automatically.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}