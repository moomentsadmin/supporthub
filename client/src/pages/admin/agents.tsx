import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserPlus, 
  Edit3,
  Search,
  Trash2
} from "lucide-react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

export default function AgentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/admin/agents"]
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest("DELETE", `/api/admin/agents/${agentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      toast({
        title: "Success",
        description: "Agent deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete agent",
        variant: "destructive",
      });
    },
  });

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteAgent = (agent: Agent) => {
    if (confirm(`Are you sure you want to delete agent "${agent.name}"? This action cannot be undone.`)) {
      deleteAgentMutation.mutate(agent.id);
    }
  };

  return (
    <AdminLayout title="Agent Management">
        {/* Search and Actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search agents by name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Link href="/admin/agents/new">
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add New Agent
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Agents List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Agents ({filteredAgents.length} of {agents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading agents...</span>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No matching agents" : "No agents found"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchTerm 
                    ? "Try adjusting your search criteria."
                    : "Get started by creating your first agent."
                  }
                </p>
                {!searchTerm && (
                  <Link href="/admin/agents/new">
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First Agent
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {agent.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{agent.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{agent.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={agent.role === 'senior_agent' ? 'default' : 'secondary'}>
                            {agent.role.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(agent.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/agents/${agent.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteAgent(agent)}
                        disabled={deleteAgentMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </AdminLayout>
  );
}