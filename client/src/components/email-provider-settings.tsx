import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Mail, Send, Settings } from "lucide-react";
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
  sendgrid: { apiKey: string; description: string };
  mailgun: { apiKey: string; domain: string; description: string };
  mailjet: { apiKey: string; username: string; description: string };
  elastic: { apiKey: string; description: string };
  smtp: { host: string; port: string; username: string; password: string; secure: boolean; description: string };
};

export function EmailProviderSettings({ className }: EmailProviderSettingsProps) {
  const { toast } = useToast();
  const [providerInfo, setProviderInfo] = useState<EmailProviderInfo | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<keyof ProviderConfig>("sendgrid");
  const [testEmail, setTestEmail] = useState("");
  const [isTestSending, setIsTestSending] = useState(false);

  const [configurations, setConfigurations] = useState<ProviderConfig>({
    sendgrid: {
      apiKey: "",
      description: "SendGrid is a reliable email delivery service with excellent deliverability rates.",
    },
    mailgun: {
      apiKey: "",
      domain: "",
      description: "Mailgun offers powerful email APIs with detailed analytics and delivery tracking.",
    },
    mailjet: {
      apiKey: "",
      username: "",
      description: "Mailjet provides both transactional and marketing email services with real-time monitoring.",
    },
    elastic: {
      apiKey: "",
      description: "Elastic Email offers cost-effective email delivery with high-volume capabilities.",
    },
    smtp: {
      host: "",
      port: "587",
      username: "",
      password: "",
      secure: false,
      description: "Connect to any SMTP server for email delivery (Gmail, Outlook, custom servers).",
    },
  });

  useEffect(() => {
    fetchProviderInfo();
  }, []);

  const fetchProviderInfo = async () => {
    try {
      const response = await apiRequest("GET", "/api/email/provider-info");
      const info = (await response.json()) as EmailProviderInfo;
      setProviderInfo(info);
      if (info?.provider) setSelectedProvider(info.provider as keyof ProviderConfig);
    } catch (error) {
      console.error("Failed to fetch email provider info:", error);
    }
  };

  const handleConfigurationUpdate = (provider: keyof ProviderConfig, field: string, value: string | boolean) => {
    setConfigurations((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  const handleSaveConfiguration = async () => {
    try {
      const response = await apiRequest("POST", "/api/email/configure", {
        provider: selectedProvider,
        configuration: configurations[selectedProvider],
      });
      const result = (await response.json()) as { success: boolean; message: string };

      if (result.success) {
        toast({
          title: "Configuration Saved",
          description: `${selectedProvider} configuration saved successfully`,
        });
        await fetchProviderInfo();
      } else {
        throw new Error(result.message || "Failed to save configuration");
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
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
      const testData: any = {
        to: testEmail,
        subject: `Test Email from SupportHub (${selectedProvider})`,
      };

      if (selectedProvider === "smtp") {
        testData.provider = "smtp";
        testData.config = configurations.smtp;
      } else {
        testData.provider = selectedProvider;
        testData.config = configurations[selectedProvider];
      }

      const response = await apiRequest("POST", "/api/admin/email/test", testData);
      const result = (await response.json()) as { success: boolean; message: string; error?: string };

      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: `Test email sent successfully to ${testEmail} using ${selectedProvider}`,
        });
      } else {
        throw new Error(result.error || result.message || "Failed to send test email");
      }
    } catch (error: any) {
      toast({
        title: "Test Email Failed",
        description:
          error.message || "Failed to send test email. Check your configuration and ensure all required fields are filled.",
        variant: "destructive",
      });
    } finally {
      setIsTestSending(false);
    }
  };

  const renderProviderConfig = (provider: keyof ProviderConfig) => {
    const config = configurations[provider];

    switch (provider) {
      case "sendgrid":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sendgrid-api-key">API Key</Label>
              <Input
                id="sendgrid-api-key"
                type="password"
                placeholder="SG.xxx"
                value={(config as ProviderConfig["sendgrid"]).apiKey}
                onChange={(e) => handleConfigurationUpdate("sendgrid", "apiKey", e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">Get your API key from SendGrid Settings → API Keys</p>
            </div>
          </div>
        );

      case "mailgun":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mailgun-domain">Domain</Label>
              <Input
                id="mailgun-domain"
                placeholder="mg.yourdomain.com"
                value={(config as ProviderConfig["mailgun"]).domain}
                onChange={(e) => handleConfigurationUpdate("mailgun", "domain", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mailgun-api-key">API Key</Label>
              <Input
                id="mailgun-api-key"
                type="password"
                placeholder="key-xxx"
                value={(config as ProviderConfig["mailgun"]).apiKey}
                onChange={(e) => handleConfigurationUpdate("mailgun", "apiKey", e.target.value)}
              />
            </div>
          </div>
        );

      case "mailjet":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mailjet-api-key">API Key</Label>
              <Input
                id="mailjet-api-key"
                type="password"
                placeholder="xxx"
                value={(config as ProviderConfig["mailjet"]).apiKey}
                onChange={(e) => handleConfigurationUpdate("mailjet", "apiKey", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mailjet-username">Username</Label>
              <Input
                id="mailjet-username"
                placeholder="your@mail.com"
                value={(config as ProviderConfig["mailjet"]).username}
                onChange={(e) => handleConfigurationUpdate("mailjet", "username", e.target.value)}
              />
            </div>
          </div>
        );

      case "elastic":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="elastic-api-key">API Key</Label>
              <Input
                id="elastic-api-key"
                type="password"
                placeholder="Elastic API key"
                value={(config as ProviderConfig["elastic"]).apiKey}
                onChange={(e) => handleConfigurationUpdate("elastic", "apiKey", e.target.value)}
              />
            </div>
          </div>
        );

      case "smtp":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={(config as ProviderConfig["smtp"]).host}
                onChange={(e) => handleConfigurationUpdate("smtp", "host", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  placeholder="587"
                  value={(config as ProviderConfig["smtp"]).port}
                  onChange={(e) => handleConfigurationUpdate("smtp", "port", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="smtp-username">Username</Label>
                <Input
                  id="smtp-username"
                  placeholder="your-email@gmail.com"
                  value={(config as ProviderConfig["smtp"]).username}
                  onChange={(e) => handleConfigurationUpdate("smtp", "username", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="smtp-password">Password</Label>
              <Input
                id="smtp-password"
                type="password"
                placeholder="Your email password or app password"
                value={(config as ProviderConfig["smtp"]).password}
                onChange={(e) => handleConfigurationUpdate("smtp", "password", e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="smtp-secure"
                checked={(config as ProviderConfig["smtp"]).secure}
                onCheckedChange={(checked) => handleConfigurationUpdate("smtp", "secure", checked)}
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <CardTitle>Email Provider Configuration</CardTitle>
            {providerInfo && (
              <Badge variant={providerInfo.configured ? "default" : "outline"}>
                {providerInfo.configured ? "Active" : "Not Configured"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Settings className="w-4 h-4" />
            <span>Choose a provider, save, then run a test send</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs
          value={selectedProvider}
          onValueChange={(val) => setSelectedProvider(val as keyof ProviderConfig)}
          className="flex flex-col lg:flex-row gap-6"
        >
          <TabsList className="lg:w-64 w-full flex lg:flex-col gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-3 shadow-sm h-fit">
            {(["sendgrid", "mailgun", "mailjet", "elastic", "smtp"] as (keyof ProviderConfig)[]).map((provider) => (
              <TabsTrigger
                key={provider}
                value={provider}
                className="justify-start w-full rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:hover:bg-gray-100 capitalize py-2.5"
              >
                {provider}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-w-0 space-y-6">
            {(["sendgrid", "mailgun", "mailjet", "elastic", "smtp"] as (keyof ProviderConfig)[]).map((provider) => (
              <TabsContent key={provider} value={provider} className="space-y-6 mt-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {provider}
                      </Badge>
                      {providerInfo?.provider === provider && (
                        <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 max-w-2xl">{configurations[provider].description}</p>
                  </div>
                  <Button variant="secondary" size="sm" className="gap-2 whitespace-nowrap" onClick={handleSaveConfiguration}>
                    <Settings className="w-4 h-4" />
                    Save {provider}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-6">{renderProviderConfig(provider)}</div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span>Save your configuration before sending a test email.</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <Input
                      placeholder="test@yourcompany.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="md:w-64"
                    />
                    <Button
                      variant="default"
                      disabled={isTestSending}
                      onClick={handleTestEmail}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {isTestSending ? "Sending..." : "Send Test"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </div>
  );
}

export default EmailProviderSettings;
