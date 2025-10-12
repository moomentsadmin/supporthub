import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Clock, CheckCircle, AlertCircle, XCircle, MessageSquare, Zap } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useMicroInteractions } from "@/hooks/useMicroInteractions";
import type { Ticket } from "@shared/schema";

interface QuickStatusWidgetProps {
  ticket: Ticket;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

const statusConfig = {
  open: {
    icon: AlertCircle,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    label: "Open"
  },
  "in-progress": {
    icon: Clock,
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    label: "In Progress"
  },
  resolved: {
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    label: "Resolved"
  },
  closed: {
    icon: XCircle,
    color: "bg-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    label: "Closed"
  }
};

const priorityConfig = {
  low: { color: "bg-green-500", label: "Low" },
  medium: { color: "bg-yellow-500", label: "Medium" },
  high: { color: "bg-red-500", label: "High" }
};

export function QuickStatusWidget({ ticket, onStatusChange, className = "" }: QuickStatusWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [updateNote, setUpdateNote] = useState("");
  const queryClient = useQueryClient();
  const { showSuccess, showError, triggerButtonFeedback, buttonStates } = useMicroInteractions();

  const updateMutation = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const response = await fetch(`/api/agent/tickets/${ticket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to update ticket");
      return response.json();
    },
    onSuccess: (data) => {
      showSuccess("Status updated", "Ticket status has been updated successfully");
      triggerButtonFeedback('update-status');
      onStatusChange?.(data.status);
      queryClient.invalidateQueries({ queryKey: ["/api/agent/tickets"] });
      setIsExpanded(false);
      setUpdateNote("");
    },
    onError: () => {
      showError("Update failed", "Could not update ticket status");
    }
  });

  const handleQuickUpdate = (status: string) => {
    setNewStatus(status);
    updateMutation.mutate({ status });
  };

  const handleDetailedUpdate = () => {
    if (newStatus !== ticket.status) {
      updateMutation.mutate({ status: newStatus, note: updateNote });
    }
  };

  const currentStatus = statusConfig[ticket.status as keyof typeof statusConfig];
  const currentPriority = priorityConfig[ticket.priority as keyof typeof priorityConfig];
  const StatusIcon = currentStatus?.icon || AlertCircle;

  return (
    <Card className={`hover-lift transition-all duration-300 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <span>Quick Status Update</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover-scale"
          >
            {isExpanded ? "Simple" : "Advanced"}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className={`p-3 rounded-lg ${currentStatus?.bgColor} animate-fade-in`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${currentStatus?.color} animate-pulse`}></div>
              <StatusIcon className={`w-4 h-4 ${currentStatus?.textColor}`} />
              <span className={`font-medium ${currentStatus?.textColor}`}>
                {currentStatus?.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${currentPriority?.color} text-white`}>
                {currentPriority?.label} Priority
              </Badge>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <AnimatedCounter value={Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60))} />h ago
              </div>
            </div>
          </div>
        </div>

        {!isExpanded ? (
          /* Quick Actions */
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon;
              const isActive = status === ticket.status;
              const isDisabled = updateMutation.isPending;
              
              return (
                <Button
                  key={status}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  disabled={isDisabled || isActive}
                  onClick={() => handleQuickUpdate(status)}
                  className={`hover-scale hover-glow justify-start ${isActive ? 'opacity-50' : ''}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {config.label}
                  {isActive && <span className="ml-auto text-xs opacity-75">Current</span>}
                </Button>
              );
            })}
          </div>
        ) : (
          /* Advanced Update Form */
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="focus-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([status, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Update Note (Optional)</label>
              <Textarea
                placeholder="Add a note about this status change..."
                value={updateNote}
                onChange={(e) => setUpdateNote(e.target.value)}
                className="focus-ring"
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleDetailedUpdate}
                disabled={updateMutation.isPending || newStatus === ticket.status}
                className={`flex-1 hover-scale hover-glow ${buttonStates['update-status'] ? 'animate-pulse' : ''}`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsExpanded(false);
                  setNewStatus(ticket.status);
                  setUpdateNote("");
                }}
                className="hover-scale"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {updateMutation.isPending && (
          <div className="flex items-center justify-center py-2 animate-fade-in">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span>Updating ticket status...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}