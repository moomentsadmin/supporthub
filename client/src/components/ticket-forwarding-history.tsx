import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Forward, Users, Mail, Clock } from "lucide-react";
import type { TicketForward } from "@shared/schema";

interface TicketForwardingHistoryProps {
  ticketId: string;
}

export function TicketForwardingHistory({ ticketId }: TicketForwardingHistoryProps) {
  const { data: forwards = [], isLoading } = useQuery({
    queryKey: [`/api/tickets/${ticketId}/forwards`]
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Forward className="w-4 h-4" />
            Forwarding History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (forwards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Forward className="w-4 h-4" />
            Forwarding History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">This ticket has not been forwarded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Forward className="w-4 h-4" />
          Forwarding History ({forwards.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {forwards.map((forward: TicketForward) => (
          <div key={forward.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {forward.forwardType === 'internal' ? (
                  <Users className="w-4 h-4 text-blue-500" />
                ) : (
                  <Mail className="w-4 h-4 text-green-500" />
                )}
                <Badge variant={forward.forwardType === 'internal' ? 'default' : 'secondary'}>
                  {forward.forwardType === 'internal' ? 'Internal' : 'External'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {forward.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {new Date(forward.createdAt).toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">From:</span> {forward.forwardedByName}
              </div>
              <div>
                <span className="font-medium text-gray-700">To:</span>{' '}
                {forward.forwardType === 'internal' 
                  ? `Agent (ID: ${forward.recipientAgentId})`
                  : `${forward.recipientName} (${forward.recipientEmail})`
                }
              </div>
              {forward.forwardMessage && (
                <div>
                  <span className="font-medium text-gray-700">Message:</span>
                  <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded text-xs">
                    "{forward.forwardMessage}"
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}