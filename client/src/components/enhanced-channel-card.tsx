import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Mail, 
  MessageSquare, 
  Twitter, 
  Facebook, 
  Phone, 
  Settings, 
  Trash2, 
  Wifi, 
  WifiOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity
} from "lucide-react";
import type { ChannelConfig } from "@shared/schema";

interface EnhancedChannelCardProps {
  channel: ChannelConfig;
  onConfigure: (channel: ChannelConfig) => void;
  onToggle: (channel: ChannelConfig) => void;
  onDelete: (id: string) => void;
  onTestConnection?: (channel: ChannelConfig) => void;
  onEmailPolling?: (channel: ChannelConfig) => void;
  isLoading?: boolean;
  isToggling?: boolean;
}

const getChannelIcon = (type: string) => {
  switch (type) {
    case "email": return Mail;
    case "whatsapp": return MessageSquare;
    case "twitter": return Twitter;
    case "facebook": return Facebook;
    case "sms": return Phone;
    default: return Settings;
  }
};

const getStatusConfig = (status: string | null) => {
  switch (status) {
    case "connected":
      return {
        variant: "default" as const,
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-900",
        icon: CheckCircle,
        pulse: false
      };
    case "disconnected":
      return {
        variant: "outline" as const,
        color: "text-gray-600",
        bgColor: "bg-gray-100 dark:bg-gray-800",
        icon: WifiOff,
        pulse: false
      };
    case "error":
      return {
        variant: "destructive" as const,
        color: "text-red-600",
        bgColor: "bg-red-100 dark:bg-red-900",
        icon: AlertCircle,
        pulse: true
      };
  }
};

export default function EnhancedChannelCard({
  channel,
  onConfigure,
  onToggle,
  onDelete,
  onTestConnection,
  onEmailPolling,
  isLoading = false,
  isToggling = false
}: EnhancedChannelCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const IconComponent = getChannelIcon(channel.type);
  const statusConfig = getStatusConfig(channel.status || "disconnected");
  const StatusIcon = statusConfig.icon;

  const getConnectionTooltip = () => {
    const status = channel.status || "disconnected";
    const errorMessage = channel.errorMessage;
    
    switch (status) {
      case "connected":
        return "Channel is connected and ready to receive messages";
      case "disconnected":
        return "Channel is not connected. Check your configuration.";
      case "error":
        return errorMessage ? `Error: ${errorMessage}` : "There's an error with this channel configuration. Click to review settings.";
      case "connecting":
        return "Channel is connecting...";
      default:
        return "Unknown status";
    }
  };

  const getValidationIssues = () => {
    const issues = [];
    
    if (channel.type === "email") {
      if (!channel.inboundSettings?.server) issues.push("Missing IMAP server");
      if (!channel.outboundSettings?.smtp_host) issues.push("Missing SMTP server");
      if (!channel.inboundSettings?.username) issues.push("Missing email credentials");
    } else if (channel.type === "sms") {
      if (!channel.config?.twilioAccountSid) issues.push("Missing Twilio Account SID");
      if (!channel.config?.twilioAuthToken) issues.push("Missing Twilio Auth Token");
      if (!channel.config?.twilioPhoneNumber) issues.push("Missing phone number");
    }
    
    return issues;
  };

  const validationIssues = getValidationIssues();
  const hasValidationIssues = validationIssues.length > 0;

  const testConnection = (channel: ChannelConfig) => {
    if (onTestConnection) {
      onTestConnection(channel);
    }
  };

  return (
    <TooltipProvider>
      <Card className={`relative transition-all duration-200 hover:shadow-lg ${
        isLoading ? "opacity-50" : ""
      } ${hasValidationIssues ? "border-orange-200 dark:border-orange-800" : ""}`}>
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-lg flex items-center justify-center z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Updating...</span>
            </div>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <IconComponent className="h-6 w-6 text-blue-600" />
                {/* Online Status Indicator */}
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                  channel.isActive ? "bg-green-500" : "bg-gray-400"
                } ${channel.isActive && statusConfig.pulse ? "animate-pulse" : ""}`}></div>
              </div>
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <span>{channel.name}</span>
                  {hasValidationIssues && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <div className="font-medium mb-1">Configuration Issues:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {validationIssues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-gray-500 capitalize">{channel.type}</span>
                  {channel.provider && (
                    <Badge variant="outline" className="text-xs">{channel.provider}</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <Tooltip>
                <TooltipTrigger>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${statusConfig.bgColor}`}>
                    <StatusIcon className={`h-3 w-3 ${statusConfig.color} ${
                      statusConfig.pulse ? "animate-pulse" : ""
                    }`} />
                    <Badge variant={statusConfig.variant} className="text-xs">
                      {channel.status || "disconnected"}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getConnectionTooltip()}</p>
                </TooltipContent>
              </Tooltip>

              {/* Active Toggle */}
              <Tooltip>
                <TooltipTrigger>
                  <div className="relative">
                    <Switch
                      checked={!!channel.isActive}
                      onCheckedChange={() => onToggle(channel)}
                      disabled={isToggling}
                      className="data-[state=checked]:bg-green-600"
                    />
                    {isToggling && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{channel.isActive ? "Click to deactivate" : "Click to activate"} this channel</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {/* Connection Statistics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-gray-500">Last Sync</div>
                  <div className="font-medium">
                    {channel.lastSync 
                      ? new Date(channel.lastSync).toLocaleDateString()
                      : "Never"
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-gray-500">Health</div>
                  <div className={`font-medium ${statusConfig.color}`}>
                    {channel.status === "connected" ? "Good" : 
                     channel.status === "error" ? "Poor" : "Unknown"}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Information Display */}
            {channel.status === 'error' && channel.errorMessage && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      Connection Error
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      {channel.errorMessage}
                    </div>
                    {channel.lastErrorTime && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Last error: {new Date(channel.lastErrorTime).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Configuration Preview */}
            {showDetails && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm space-y-2">
                  {channel.type === "email" && (
                    <>
                      {channel.inboundSettings?.server && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">IMAP:</span>
                          <span className="font-mono text-xs">{channel.inboundSettings.server}</span>
                        </div>
                      )}
                      {channel.outboundSettings?.smtp_host && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">SMTP:</span>
                          <span className="font-mono text-xs">{channel.outboundSettings.smtp_host}</span>
                        </div>
                      )}
                    </>
                  )}
                  {channel.type === "sms" && channel.config?.twilioPhoneNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-mono text-xs">{channel.config.twilioPhoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs"
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </Button>
              
              <div className="flex items-center space-x-2">
                {channel.type === 'email' && onEmailPolling && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEmailPolling(channel)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Email polling settings</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(channel)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Wifi className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Test connection</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onConfigure(channel)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Configure channel settings</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(channel.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete this channel</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}