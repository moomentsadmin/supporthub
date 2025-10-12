import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
      const widget = document.getElementById('supporthub-chat-widget');
      if (widget) widget.remove();
    };
  }, []);

  return null;
}

export default ChatWidget;`;

  const wordpressEmbed = `<?php
// Add to your WordPress theme's functions.php or use a custom plugin

function add_supporthub_chat_widget() {
    ?>
    <script 
      src="${baseUrl}/widget.js"
      data-supporthub-api="${baseUrl}"
      data-supporthub-color="${widgetConfig.primaryColor}"
      data-supporthub-position="${widgetConfig.position}"
      data-supporthub-company="${widgetConfig.companyName}">
    </script>
    <?php
}
add_action('wp_footer', 'add_supporthub_chat_widget');
?>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} code copied to clipboard`,
      });
    });
  };

  const downloadWidget = () => {
    const blob = new Blob([htmlEmbed], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supporthub-widget.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Widget Integration
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Embed the live chat widget on any website to receive customer inquiries
              </p>
            </div>
            <Button onClick={downloadWidget} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Example
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Widget Configuration */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Widget Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={widgetConfig.companyName}
                    onChange={(e) => setWidgetConfig(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={widgetConfig.primaryColor}
                      onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={widgetConfig.primaryColor}
                      onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div>
                  <Label>Position</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button
                      variant={widgetConfig.position === 'bottom-right' ? 'default' : 'outline'}
                      onClick={() => setWidgetConfig(prev => ({ ...prev, position: 'bottom-right' }))}
                      className="text-sm"
                    >
                      Bottom Right
                    </Button>
                    <Button
                      variant={widgetConfig.position === 'bottom-left' ? 'default' : 'outline'}
                      onClick={() => setWidgetConfig(prev => ({ ...prev, position: 'bottom-left' }))}
                      className="text-sm"
                    >
                      Bottom Left
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
                  <Input
                    id="customDomain"
                    value={widgetConfig.customDomain}
                    onChange={(e) => setWidgetConfig(prev => ({ ...prev, customDomain: e.target.value }))}
                    placeholder="https://support.yourcompany.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use current domain
                  </p>
                </div>

                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    Changes to widget configuration are reflected in real-time in the embed codes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Integration Instructions */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="simple" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="simple">Simple</TabsTrigger>
                <TabsTrigger value="html">HTML/JS</TabsTrigger>
                <TabsTrigger value="react">React</TabsTrigger>
                <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              </TabsList>

              <TabsContent value="simple" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Code className="w-5 h-5" />
                      <span>Simple Integration</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add this single script tag to your website's HTML before the closing &lt;/body&gt; tag
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{scriptEmbed}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(scriptEmbed, "Simple integration")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="html" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Code className="w-5 h-5" />
                      <span>Manual HTML/JavaScript Integration</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      For more control over the widget initialization
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{htmlEmbed}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(htmlEmbed, "HTML/JS integration")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="react" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Code className="w-5 h-5" />
                      <span>React Component Integration</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Integration for React applications
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{reactEmbed}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(reactEmbed, "React integration")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="wordpress" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Code className="w-5 h-5" />
                      <span>WordPress Integration</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add to your theme's functions.php file
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{wordpressEmbed}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(wordpressEmbed, "WordPress integration")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Features & Benefits */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Widget Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Customizable Design</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Match your brand colors and positioning
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Mobile Responsive</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Works perfectly on all device sizes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Lightweight</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Minimal impact on page load times
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Easy Integration</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Single script tag installation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Real-time Messaging</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Instant communication with your support team
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">GDPR Compliant</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Respects user privacy and data protection
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testing */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="w-5 h-5" />
                  <span>Testing & Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Test the widget on your website before going live:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Copy one of the integration codes above</li>
                    <li>Add it to a test page on your website</li>
                    <li>Open the page and click the chat button</li>
                    <li>Start a test conversation to verify functionality</li>
                    <li>Check that messages appear in your agent dashboard</li>
                  </ol>
                  <Alert>
                    <Eye className="w-4 h-4" />
                    <AlertDescription>
                      All chat sessions from embedded widgets will appear in your agent dashboard for real-time response.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}