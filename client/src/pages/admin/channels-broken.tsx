import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, MessageSquare, Twitter, Facebook, Plus, Settings, Power, Eye, EyeOff, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/admin-layout";
import type { ChannelConfig } from "@shared/schema";
import ChannelSetupWizard from "@/components/channel-setup-wizard";
import EnhancedChannelCard from "@/components/enhanced-channel-card";
import EmailPollingSettings from "@/components/email-polling-settings";

export default function ChannelsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<ChannelConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [emailPollingChannel, setEmailPollingChannel] = useState<ChannelConfig | null>(null);

  const { data: channels = [], isLoading } = useQuery<ChannelConfig[]>({
    queryKey: ["/api/admin/channels"],
  });

  const toggleChannelMutation = useMutation({
    mutationFn: async (data: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/channels/${data.id}/toggle`, {
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({ title: "Channel status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update channel status", variant: "destructive" });
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ChannelConfig> }) => {
      console.log("Updating channel with data:", data);
      const response = await apiRequest("PATCH", `/api/admin/channels/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: (result) => {
      console.log("Channel updated successfully:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({ title: "Channel updated successfully" });
      setSelectedChannel(null);
    },
    onError: (error) => {
      console.error("Failed to update channel:", error);
      toast({ 
        title: "Failed to update channel", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: Partial<ChannelConfig>) => {
      console.log("Creating channel with data:", data);
      const response = await apiRequest("POST", "/api/admin/channels", data);
      return response.json();
    },
    onSuccess: (result) => {
      console.log("Channel created successfully:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({ title: "Channel created successfully" });
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      console.error("Failed to create channel:", error);
      toast({ 
        title: "Failed to create channel", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({ title: "Channel deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete channel", variant: "destructive" });
    },
  });

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-5 w-5" />;
      case "whatsapp": return <MessageSquare className="h-5 w-5" />;
      case "twitter": return <Twitter className="h-5 w-5" />;
      case "facebook": return <Facebook className="h-5 w-5" />;
      case "sms": return <Phone className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case "connected": return "secondary";
      case "disconnected": return "outline";
      case "error": return "destructive";
      default: return "secondary";
    }
  };

  const handleToggleChannel = async (channel: ChannelConfig) => {
    await toggleChannelMutation.mutateAsync({
      id: channel.id,
      isActive: !channel.isActive,
    });
  };

  const handleUpdateChannel = async (updates: Partial<ChannelConfig>) => {
    if (!selectedChannel) return;
    await updateChannelMutation.mutateAsync({
      id: selectedChannel.id,
      updates,
    });
  };

  const handleCreateChannel = async (data: any) => {
    await createChannelMutation.mutateAsync(data);
  };

  const handleWizardComplete = async (channelData: any) => {
    await handleCreateChannel(channelData);
    setIsWizardOpen(false);
  };

  const handleTestConnection = async (channel: ChannelConfig) => {
    try {
      const response: any = await apiRequest("POST", "/api/admin/channels/test", channel);
      toast({
        title: response.success ? "Connection Successful" : "Connection Failed",
        description: response.message,
        variant: response.success ? "default" : "destructive"
      });
      
      // If successful, refresh the channels to get updated status
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      }
    } catch (error: any) {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Unable to test connection",
        variant: "destructive"
      });
    }
  };

  const handleEmailPolling = (channel: ChannelConfig) => {
    setEmailPollingChannel(channel);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Channel Configuration">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading channels...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Channel Configuration">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button onClick={() => setIsWizardOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Setup New Channel
          </Button>
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Channel</DialogTitle>
            </DialogHeader>
            <CreateChannelForm onSubmit={handleCreateChannel} />
          </DialogContent>
        </Dialog>
      </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center justify-center space-x-2 h-24 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-6 h-6" />
              <span>Setup Wizard</span>
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              variant="outline"
              className="flex items-center justify-center space-x-2 h-24"
            >
              <Settings className="w-6 h-6" />
              <span>Manual Setup</span>
            </Button>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Channels</div>
              <div className="text-2xl font-bold">{channels.length}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</div>
              <div className="text-2xl font-bold text-green-600">
                {channels.filter(c => c.isActive).length}
              </div>
            </div>
          </div>
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel: ChannelConfig) => (
          <EnhancedChannelCard
            key={channel.id}
            channel={channel}
            onConfigure={(channel) => setSelectedChannel(channel)}
            onToggle={handleToggleChannel}
            onDelete={(id) => deleteChannelMutation.mutate(id)}
            onTestConnection={handleTestConnection}
            onEmailPolling={handleEmailPolling}
            isLoading={updateChannelMutation.isPending && selectedChannel?.id === channel.id}
            isToggling={toggleChannelMutation.isPending}
          />
        ))}
      </div>

      {selectedChannel && (
        <ChannelConfigDialog
          channel={selectedChannel}
          onClose={() => setSelectedChannel(null)}
          onUpdate={handleUpdateChannel}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
      )}

      {/* Channel Setup Wizard */}
      <ChannelSetupWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleWizardComplete}
      />

      {emailPollingChannel && (
        <EmailPollingSettings
          channel={emailPollingChannel}
          isOpen={!!emailPollingChannel}
          onClose={() => setEmailPollingChannel(null)}
        />
      )}
    </AdminLayout>
  );
}

function CreateChannelForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    provider: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    inboundSettings: {
      server: "",
      port: 993,
      protocol: "imap" as "imap" | "pop3",
      username: "",
      password: "",
      ssl: true,
      tls: false,
    },
    outboundSettings: {
      smtp_host: "",
      smtp_port: 587,
      username: "",
      password: "",
      ssl: false,
      tls: true,
      auth_method: "login" as "login" | "oauth2",
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const emailProviders = [
    { value: "gmail", label: "Gmail", 
      inbound: { server: "imap.gmail.com", port: 993, ssl: true },
      outbound: { smtp_host: "smtp.gmail.com", smtp_port: 587, tls: true }
    },
    { value: "office365", label: "Office 365",
      inbound: { server: "outlook.office365.com", port: 993, ssl: true },
      outbound: { smtp_host: "smtp.office365.com", smtp_port: 587, tls: true }
    },
    { value: "outlook", label: "Outlook.com",
      inbound: { server: "imap-mail.outlook.com", port: 993, ssl: true },
      outbound: { smtp_host: "smtp-mail.outlook.com", smtp_port: 587, tls: true }
    },
    { value: "custom", label: "Custom SMTP/IMAP" }
  ];

  const handleProviderChange = (provider: string) => {
    setFormData(prev => ({ ...prev, provider }));
    
    const providerConfig = emailProviders.find(p => p.value === provider);
    if (providerConfig && providerConfig.value !== "custom") {
      setFormData(prev => ({
        ...prev,
        inboundSettings: { ...prev.inboundSettings, ...providerConfig.inbound },
        outboundSettings: { ...prev.outboundSettings, ...providerConfig.outbound },
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Channel Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Channel Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.type === "email" && (
        <Tabs defaultValue="provider" className="w-full">
          <TabsList>
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="inbound">Inbound Settings</TabsTrigger>
            <TabsTrigger value="outbound">Outbound Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="provider" className="space-y-4">
            <div>
              <Label htmlFor="provider">Email Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {emailProviders.map(provider => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="inbound" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inbound-server">IMAP Server</Label>
                <Input
                  id="inbound-server"
                  value={formData.inboundSettings.server}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    inboundSettings: { ...prev.inboundSettings, server: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="inbound-port">Port</Label>
                <Input
                  id="inbound-port"
                  type="number"
                  value={formData.inboundSettings.port}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    inboundSettings: { ...prev.inboundSettings, port: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inbound-username">Username</Label>
                <Input
                  id="inbound-username"
                  value={formData.inboundSettings.username}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    inboundSettings: { ...prev.inboundSettings, username: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="inbound-password">Password</Label>
                <Input
                  id="inbound-password"
                  type="password"
                  value={formData.inboundSettings.password}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    inboundSettings: { ...prev.inboundSettings, password: e.target.value }
                  }))}
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.inboundSettings.ssl}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    inboundSettings: { ...prev.inboundSettings, ssl: checked }
                  }))}
                />
                <Label>Use SSL</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.inboundSettings.tls}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    inboundSettings: { ...prev.inboundSettings, tls: checked }
                  }))}
                />
                <Label>Use TLS</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outbound" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-host">SMTP Server</Label>
                <Input
                  id="smtp-host"
                  value={formData.outboundSettings.smtp_host}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    outboundSettings: { ...prev.outboundSettings, smtp_host: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={formData.outboundSettings.smtp_port}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    outboundSettings: { ...prev.outboundSettings, smtp_port: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-username">Username</Label>
                <Input
                  id="smtp-username"
                  value={formData.outboundSettings.username}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    outboundSettings: { ...prev.outboundSettings, username: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="smtp-password">Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={formData.outboundSettings.password}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    outboundSettings: { ...prev.outboundSettings, password: e.target.value }
                  }))}
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.outboundSettings.ssl}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    outboundSettings: { ...prev.outboundSettings, ssl: checked }
                  }))}
                />
                <Label>Use SSL</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.outboundSettings.tls}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    outboundSettings: { ...prev.outboundSettings, tls: checked }
                  }))}
                />
                <Label>Use TLS</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {formData.type === "sms" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="twilio-sid">Twilio Account SID</Label>
              <Input
                id="twilio-sid"
                value={formData.twilioAccountSid || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, twilioAccountSid: e.target.value }))}
                placeholder="Enter your Twilio Account SID"
                required
              />
            </div>
            <div>
              <Label htmlFor="twilio-token">Twilio Auth Token</Label>
              <Input
                id="twilio-token"
                type="password"
                value={formData.twilioAuthToken || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, twilioAuthToken: e.target.value }))}
                placeholder="Enter your Twilio Auth Token"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="twilio-phone">Twilio Phone Number</Label>
            <Input
              id="twilio-phone"
              value={formData.twilioPhoneNumber || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, twilioPhoneNumber: e.target.value }))}
              placeholder="+1234567890"
              required
            />
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="submit">Create Channel</Button>
      </div>
    </form>
  );
}

function ChannelConfigDialog({
  channel,
  onClose,
  onUpdate,
  showPassword,
  onTogglePassword,
}: {
  channel: ChannelConfig;
  onClose: () => void;
  onUpdate: (updates: Partial<ChannelConfig>) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  const [formData, setFormData] = useState({
    name: channel.name,
    provider: channel.provider || "",
    twilioAccountSid: channel.config?.twilioAccountSid || "",
    twilioAuthToken: channel.config?.twilioAuthToken || "",
    twilioPhoneNumber: channel.config?.twilioPhoneNumber || "",
    // For email channels, try to get settings from config first, then fallback to direct properties
    inboundSettings: channel.config?.inboundSettings || channel.inboundSettings || {},
    outboundSettings: channel.config?.outboundSettings || channel.outboundSettings || {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prepare config object based on channel type
    let config = channel.config || {};
    
    if (channel.type === "sms") {
      config = {
        ...config,
        twilioAccountSid: formData.twilioAccountSid,
        twilioAuthToken: formData.twilioAuthToken,
        twilioPhoneNumber: formData.twilioPhoneNumber,
      };
    } else if (channel.type === "email") {
      // For email channels, merge inbound and outbound settings into config
      config = {
        ...config,
        inboundSettings: formData.inboundSettings,
        outboundSettings: formData.outboundSettings,
      };
    }

    onUpdate({
      name: formData.name,
      provider: formData.provider,
      config,
      // Include these for non-email channels or if needed elsewhere
      inboundSettings: formData.inboundSettings,
      outboundSettings: formData.outboundSettings,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {channel.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {channel.type === "email" && (
            <Tabs defaultValue="inbound" className="w-full">
              <TabsList>
                <TabsTrigger value="inbound">Inbound Settings</TabsTrigger>
                <TabsTrigger value="outbound">Outbound Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="inbound" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inbound-server">IMAP Server</Label>
                    <Input
                      id="inbound-server"
                      value={formData.inboundSettings?.server || ""}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        inboundSettings: { ...prev.inboundSettings, server: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="inbound-port">Port</Label>
                    <Input
                      id="inbound-port"
                      type="number"
                      value={formData.inboundSettings?.port || 993}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        inboundSettings: { ...prev.inboundSettings, port: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inbound-username">Username</Label>
                    <Input
                      id="inbound-username"
                      value={formData.inboundSettings?.username || ""}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        inboundSettings: { ...prev.inboundSettings, username: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="inbound-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="inbound-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.inboundSettings?.password || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          inboundSettings: { ...prev.inboundSettings, password: e.target.value }
                        }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={onTogglePassword}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="outbound" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp-host">SMTP Server</Label>
                    <Input
                      id="smtp-host"
                      value={formData.outboundSettings?.smtp_host || ""}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        outboundSettings: { ...prev.outboundSettings, smtp_host: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      value={formData.outboundSettings?.smtp_port || 587}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        outboundSettings: { ...prev.outboundSettings, smtp_port: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp-username">Username</Label>
                    <Input
                      id="smtp-username"
                      value={formData.outboundSettings?.username || ""}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        outboundSettings: { ...prev.outboundSettings, username: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="smtp-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.outboundSettings?.password || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          outboundSettings: { ...prev.outboundSettings, password: e.target.value }
                        }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={onTogglePassword}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {channel.type === "sms" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Twilio Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="config-twilio-sid">Twilio Account SID</Label>
                  <Input
                    id="config-twilio-sid"
                    value={formData.twilioAccountSid || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, twilioAccountSid: e.target.value }))}
                    placeholder="Enter your Twilio Account SID"
                  />
                </div>
                <div>
                  <Label htmlFor="config-twilio-token">Twilio Auth Token</Label>
                  <div className="relative">
                    <Input
                      id="config-twilio-token"
                      type={showPassword ? "text" : "password"}
                      value={formData.twilioAuthToken || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, twilioAuthToken: e.target.value }))}
                      placeholder="Enter your Twilio Auth Token"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={onTogglePassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="config-twilio-phone">Twilio Phone Number</Label>
                <Input
                  id="config-twilio-phone"
                  value={formData.twilioPhoneNumber || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, twilioPhoneNumber: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Update Channel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

