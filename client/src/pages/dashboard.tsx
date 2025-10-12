import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import TicketList from "@/components/ticket-list";
import TicketDetail from "@/components/ticket-detail";
import ResponseModal from "@/components/response-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Timer,
  Mail,
  MessageCircle,
  AtSign,
  Facebook,
  Smartphone
} from "lucide-react";
import type { Ticket, DashboardStats, ChannelStatus } from "@shared/schema";

export default function Dashboard() {
  const { config: whitelabelConfig } = useWhitelabelContext();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"]
  });

  const { data: channelStatus } = useQuery<ChannelStatus>({
    queryKey: ["/api/channels/status"]
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="w-4 h-4" />;
      case "whatsapp": return <MessageCircle className="w-4 h-4" />;
      case "twitter": return <AtSign className="w-4 h-4" />;
      case "facebook": return <Facebook className="w-4 h-4" />;
      case "sms": return <Smartphone className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel: string, status: string) => {
    if (status === "connected") return "text-green-600";
    if (status === "reconnect_needed") return "text-orange-600";
    return "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 ml-64 p-6">
          {/* Dashboard Stats */}
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {stats?.openTickets ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {stats?.inProgressTickets ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {stats?.resolvedToday ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Response</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {stats?.avgResponse ?? "0h"}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Timer className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tickets Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TicketList 
                onSelectTicket={setSelectedTicket}
                selectedTicket={selectedTicket}
              />
            </div>
            
            <div className="lg:col-span-1">
              <TicketDetail 
                ticket={selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onRespond={() => setResponseModalOpen(true)}
                onViewFull={(ticket) => window.location.href = `/agents/tickets/${ticket.id}`}
                onEscalate={(ticket) => window.location.href = `/agents/tickets/${ticket.id}`}
                onReassign={(ticket) => window.location.href = `/agents/tickets/${ticket.id}`}
              />
            </div>
          </div>

          {/* Channel Integration Panel */}
          <div className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Channel Integration Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {["email", "whatsapp", "twitter", "facebook", "sms"].map((channel) => (
                    <div key={channel} className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                        channelStatus?.[channel as keyof ChannelStatus] === "connected" ? "bg-green-100" :
                        channelStatus?.[channel as keyof ChannelStatus] === "reconnect_needed" ? "bg-orange-100" : "bg-gray-100"
                      }`}>
                        <span className={getChannelColor(channel, channelStatus?.[channel as keyof ChannelStatus] || "")}>
                          {getChannelIcon(channel)}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1 capitalize">
                        {channel === "twitter" ? "X (Twitter)" : channel}
                      </h4>
                      <Badge 
                        variant={channelStatus?.[channel as keyof ChannelStatus] === "connected" ? "default" : "secondary"}
                        className="mb-2"
                      >
                        {channelStatus?.[channel as keyof ChannelStatus] === "connected" ? "Connected" : 
                         channelStatus?.[channel as keyof ChannelStatus] === "reconnect_needed" ? "Reconnect needed" : "Offline"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <ResponseModal 
        ticket={selectedTicket}
        open={responseModalOpen}
        onClose={() => setResponseModalOpen(false)}
      />
    </div>
  );
}
