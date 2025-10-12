import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ChannelConfig } from "@shared/schema";

interface EmailPollingSettingsProps {
  channel: ChannelConfig;
  isOpen: boolean;
  onClose: () => void;
}

interface PollingStatus {
  isActive: boolean;
  isCurrentlyPolling: boolean;
  config: {
    interval: number;
    enabled: boolean;
    maxEmails: number;
  };
}

export default function EmailPollingSettings({ channel, isOpen, onClose }: EmailPollingSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [interval, setInterval] = useState(1);
  const [enabled, setEnabled] = useState(false);
  const [maxEmails, setMaxEmails] = useState(50);

  // Query polling status
  const { data: pollingStatus, isLoading } = useQuery({
    queryKey: [`/api/admin/channels/${channel.id}/polling/status`],
    enabled: isOpen && channel.type === 'email',
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Initialize form with current settings
  useEffect(() => {
    if (pollingStatus && 'config' in pollingStatus) {
      setInterval(pollingStatus.config?.interval || 1);
      setEnabled(pollingStatus.config?.enabled || false);
      setMaxEmails(pollingStatus.config?.maxEmails || 50);
    }
  }, [pollingStatus]);

  const startPollingMutation = useMutation({
    mutationFn: async (config: { interval: number; enabled: boolean; maxEmails: number }) => {
      return apiRequest("POST", `/api/admin/channels/${channel.id}/polling/start`, config);
    },
    onSuccess: () => {
      toast({
        title: "Email Polling Started",
        description: `Email polling will run every ${interval} minute(s)`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/channels/${channel.id}/polling/status`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Polling",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopPollingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/channels/${channel.id}/polling/stop`, {});
    },
    onSuccess: () => {
      toast({
        title: "Email Polling Stopped",
        description: "Email polling has been disabled for this channel",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/channels/${channel.id}/polling/status`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop Polling",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (enabled) {
      startPollingMutation.mutate({ interval, enabled, maxEmails });
    } else {
      stopPollingMutation.mutate();
    }
  };

  const getPollingStatusDisplay = () => {
    if (!pollingStatus) return null;
    
    const status = pollingStatus as PollingStatus;
    
    if (status.isCurrentlyPolling) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Currently Polling
        </Badge>
      );
    }
    
    if (status.isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <AlertCircle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  if (!isOpen || channel.type !== 'email') return null;

  const intervals = [
    { value: 1, label: "1 minute" },
    { value: 2, label: "2 minutes" },
    { value: 5, label: "5 minutes" },
    { value: 10, label: "10 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Polling Settings
          </CardTitle>
          <CardDescription>
            Configure automatic email fetching for {channel.name}
          </CardDescription>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {getPollingStatusDisplay()}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Email Polling</Label>
              <p className="text-sm text-muted-foreground">
                Automatically fetch new emails from this account
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isLoading}
            />
          </div>
          
          {enabled && (
            <>
              <div className="space-y-2">
                <Label>Polling Interval</Label>
                <Select
                  value={interval.toString()}
                  onValueChange={(value) => setInterval(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {intervals.map((int) => (
                      <SelectItem key={int.value} value={int.value.toString()}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {int.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How often to check for new emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxEmails">Max Emails per Poll</Label>
                <Input
                  id="maxEmails"
                  type="number"
                  min="1"
                  max="100"
                  value={maxEmails}
                  onChange={(e) => setMaxEmails(parseInt(e.target.value) || 50)}
                  placeholder="50"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of emails to process in each polling cycle
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={startPollingMutation.isPending || stopPollingMutation.isPending}
            >
              {(startPollingMutation.isPending || stopPollingMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}