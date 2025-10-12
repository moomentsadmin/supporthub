import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Mail, Send, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailProviderInfo {
  provider: string;
  configured: boolean;
}

interface EmailProviderSettingsProps {
  className?: string;
}

type ProviderConfig = {
  sendgrid: { apiKey: string; description: string; };
  mailgun: { apiKey: string; domain: string; description: string; };
  mailjet: { apiKey: string; username: string; description: string; };
  elastic: { apiKey: string; description: string; };
  smtp: { host: string; port: string; username: string; password: string; secure: boolean; description: string; };
};

export function EmailProviderSettings({ className }: EmailProviderSettingsProps) {
  const [providerInfo, setProviderInfo] = useState<EmailProviderInfo | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);
  const { toast } = useToast();

  // Provider configurations
  const [selectedProvider, setSelectedProvider] = useState<keyof ProviderConfig>('sendgrid');
  const [configurations, setConfigurations] = useState<ProviderConfig>({
    sendgrid: {
      apiKey: '',
      description: 'SendGrid is a reliable email delivery service with excellent deliverability rates.'
    },
    mailgun: {
      apiKey: '',
      domain: '',
      description: 'Mailgun offers powerful email APIs with detailed analytics and delivery tracking.'
    },
    mailjet: {
      apiKey: '',
      username: '',
      description: 'Mailjet provides both transactional and marketing email services with real-time monitoring.'
    },
    elastic: {
      apiKey: '',
      description: 'Elastic Email offers cost-effective email delivery with high-volume capabilities.'
    },
    smtp: {
      host: '',
      port: '587',
      username: '',
      password: '',
      secure: false,
      description: 'Connect to any SMTP server for email delivery (Gmail, Outlook, custom servers).'
    }
  });

  useEffect(() => {
    fetchProviderInfo();
  }, []);

  const fetchProviderInfo = async () => {
    try {
      const response = await apiRequest('GET', '/api/email/provider-info');
      const providerInfo = await response.json() as EmailProviderInfo;
      setProviderInfo(providerInfo);
      setSelectedProvider(providerInfo.provider as keyof ProviderConfig);
    } catch (error) {
      console.error('Failed to fetch email provider info:', error);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test email to.",
        variant: "destructive",
      });
      return;
    }

    setIsTestSending(true);
    try {
      // Prepare test data with current provider configuration
      const testData: any = { 
        to: testEmail,
        subject: `Test Email from SupportHub (${selectedProvider})`
      };
      
      // For SMTP provider, include current configuration for direct testing
      if (selectedProvider === 'smtp') {
        testData.provider = 'smtp';
        testData.config = configurations.smtp;
      } else {
        // For other providers, include their configuration
        testData.provider = selectedProvider;
        testData.config = configurations[selectedProvider];
      }

      const response = await apiRequest('POST', '/api/admin/email/test', testData);
      const result = await response.json() as { success: boolean; message: string; error?: string };

      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: `Test email sent successfully to ${testEmail} using ${selectedProvider}`,
        });
      } else {
        throw new Error(result.error || result.message || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Email test error:', error);
      toast({
        title: "Test Email Failed",
        description: error.message || "Failed to send test email. Check your configuration and ensure all required fields are filled.",
        variant: "destructive",
      });
    } finally {
      setIsTestSending(false);
    }
  };

  const handleConfigurationUpdate = (provider: keyof ProviderConfig, field: string, value: string | boolean) => {
    setConfigurations(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const handleSaveConfiguration = async () => {
    try {
      const response = await apiRequest('POST', '/api/email/configure', {
        provider: selectedProvider,
        configuration: configurations[selectedProvider]
      });
      const result = await response.json() as { success: boolean; message: string };

      if (result.success) {
        toast({
          title: "Configuration Saved",
          description: `${selectedProvider} configuration saved successfully`,
        });
        await fetchProviderInfo(); // Refresh provider info
      } else {
        throw new Error(result.message || 'Failed to save configuration');
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    }
  };

  const renderProviderConfig = (provider: keyof ProviderConfig) => {
    const config = configurations[provider];
    
    switch (provider) {
      case 'sendgrid':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sendgrid-api-key">API Key</Label>
              <Input
                id="sendgrid-api-key"
                type="password"
                placeholder="SG.xxx"
                value={(config as ProviderConfig['sendgrid']).apiKey}
                onChange={(e) => handleConfigurationUpdate('sendgrid', 'apiKey', e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Get your API key from SendGrid Settings → API Keys
              </p>
            </div>
          </div>
        );

      case 'mailgun':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mailgun-domain">Domain</Label>
              <Input
                id="mailgun-domain"
                placeholder="mg.yourdomain.com"
                value={(config as ProviderConfig['mailgun']).domain}
                onChange={(e) => handleConfigurationUpdate('mailgun', 'domain', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mailgun-api-key">API Key</Label>
              <Input
                id="mailgun-api-key"
                type="password"
                placeholder="key-xxx"
                value={(config as ProviderConfig['mailgun']).apiKey}
                onChange={(e) => handleConfigurationUpdate('mailgun', 'apiKey', e.target.value)}
              />
            </div>
          </div>
        );

      case 'mailjet':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mailjet-username">API Key (Username)</Label>
              <Input
                id="mailjet-username"
                placeholder="Your API Key"
                value={(config as ProviderConfig['mailjet']).username}
                onChange={(e) => handleConfigurationUpdate('mailjet', 'username', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mailjet-api-key">Secret Key</Label>
              <Input
                id="mailjet-api-key"
                type="password"
                placeholder="Your Secret Key"
                value={(config as ProviderConfig['mailjet']).apiKey}
                onChange={(e) => handleConfigurationUpdate('mailjet', 'apiKey', e.target.value)}
              />
            </div>
          </div>
        );

      case 'elastic':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="elastic-api-key">API Key</Label>
              <Input
                id="elastic-api-key"
                type="password"
                placeholder="Your Elastic Email API Key"
                value={(config as ProviderConfig['elastic']).apiKey}
                onChange={(e) => handleConfigurationUpdate('elastic', 'apiKey', e.target.value)}
              />
            </div>
          </div>
        );

      case 'smtp':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={(config as ProviderConfig['smtp']).host}
                onChange={(e) => handleConfigurationUpdate('smtp', 'host', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                placeholder="587"
                value={(config as ProviderConfig['smtp']).port}
                onChange={(e) => handleConfigurationUpdate('smtp', 'port', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="smtp-username">Username</Label>
              <Input
                id="smtp-username"
                placeholder="your-email@gmail.com"
                value={(config as ProviderConfig['smtp']).username}
                onChange={(e) => handleConfigurationUpdate('smtp', 'username', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="smtp-password">Password</Label>
              <Input
                id="smtp-password"
                type="password"
                placeholder="Your email password or app password"
                value={(config as ProviderConfig['smtp']).password}
                onChange={(e) => handleConfigurationUpdate('smtp', 'password', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="smtp-secure"
                checked={(config as ProviderConfig['smtp']).secure}
                onCheckedChange={(checked) => handleConfigurationUpdate('smtp', 'secure', checked)}
              />
              <Label htmlFor="smtp-secure">Use secure connection (TLS)</Label>
            </div>
          </div>
        );

      default:
        return <div>Configuration not available</div>;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Provider Configuration
            {providerInfo && (
              <Badge variant={providerInfo.configured ? "default" : "destructive"}>
                {providerInfo.configured ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Not Configured
                  </>
                )}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as keyof ProviderConfig)} className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="sendgrid" className="text-xs">SendGrid</TabsTrigger>
              <TabsTrigger value="mailgun" className="text-xs">Mailgun</TabsTrigger>
              <TabsTrigger value="mailjet" className="text-xs">Mailjet</TabsTrigger>
              <TabsTrigger value="elastic" className="text-xs">Elastic Email</TabsTrigger>
              <TabsTrigger value="smtp" className="text-xs">SMTP</TabsTrigger>
            </TabsList>

            {Object.entries(configurations).map(([provider, config]) => (
              <TabsContent key={provider} value={provider as keyof ProviderConfig} className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 capitalize">{provider}</h4>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>

                {renderProviderConfig(provider as keyof ProviderConfig)}

                {/* Save Configuration Button */}
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveConfiguration} className="gap-2">
                    <Settings className="w-4 h-4" />
                    Save Configuration
                  </Button>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Environment Variables</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                    Add these environment variables to your production deployment:
                  </p>
                  <div className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded font-mono text-xs space-y-1">
                    <div>EMAIL_PROVIDER={provider}</div>
                    {provider === 'sendgrid' && <div>EMAIL_API_KEY=your_sendgrid_api_key</div>}
                    {provider === 'mailgun' && (
                      <>
                        <div>EMAIL_API_KEY=your_mailgun_api_key</div>
                        <div>EMAIL_DOMAIN=your_mailgun_domain</div>
                      </>
                    )}
                    {provider === 'mailjet' && (
                      <>
                        <div>EMAIL_USERNAME=your_mailjet_api_key</div>
                        <div>EMAIL_API_KEY=your_mailjet_secret_key</div>
                      </>
                    )}
                    {provider === 'elastic' && <div>EMAIL_API_KEY=your_elastic_email_api_key</div>}
                    {provider === 'smtp' && (
                      <>
                        <div>SMTP_HOST=your_smtp_host</div>
                        <div>SMTP_PORT=587</div>
                        <div>EMAIL_USERNAME=your_email@domain.com</div>
                        <div>EMAIL_PASSWORD=your_email_password</div>
                        <div>SMTP_SECURE=true</div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Test Email Section */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Test Email Configuration
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleTestEmail} 
                disabled={isTestSending}
              >
                {isTestSending ? "Sending..." : "Send Test Email"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Send a test email to verify your email provider configuration is working correctly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}