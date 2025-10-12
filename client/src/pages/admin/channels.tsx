import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, MessageSquare, Twitter, Facebook, Plus, Phone } from "lucide-react";
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
      const response = await apiRequest("PATCH", `/api/admin/channels/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({ title: "Channel updated successfully" });
      setSelectedChannel(null);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update channel", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: Partial<ChannelConfig>) => {
      const response = await apiRequest("POST", "/api/admin/channels", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({ title: "Channel created successfully" });
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
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
      default: return <Mail className="h-5 w-5" />;
    }
  };

  const handleWizardComplete = (channelData: any) => {
    createChannelMutation.mutate(channelData);
    setIsWizardOpen(false);
  };

  const handleUpdateChannel = (updates: Partial<ChannelConfig>) => {
    if (selectedChannel) {
      updateChannelMutation.mutate({
        id: selectedChannel.id,
        updates,
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
          <div>
            <p className="text-muted-foreground">
              Configure and manage communication channels for customer support
            </p>
          </div>
          <Button onClick={() => setIsWizardOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Setup New Channel
          </Button>
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <EnhancedChannelCard
              key={channel.id}
              channel={channel}
              onConfigure={setSelectedChannel}
              onToggle={(channel) => toggleChannelMutation.mutate({ id: channel.id, isActive: !channel.isActive })}
              onDelete={(id) => deleteChannelMutation.mutate(id)}
              onEmailPolling={handleEmailPolling}
              isLoading={updateChannelMutation.isPending && selectedChannel?.id === channel.id}
              isToggling={toggleChannelMutation.isPending}
            />
          ))}
        </div>

        {/* Empty State */}
        {channels.length === 0 && (
          <Card className="p-12 text-center">
            <div className="space-y-4">
              <div className="flex justify-center">
                <MessageSquare className="h-16 w-16 text-gray-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No channels configured</h3>
                <p className="text-gray-600">Get started by setting up your first communication channel</p>
              </div>
              <Button onClick={() => setIsWizardOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Setup New Channel
              </Button>
            </div>
          </Card>
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
      </div>
    </AdminLayout>
  );
}