import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, 
  Search, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Mail,
  Phone,
  Users,
  BookOpen,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Tag,
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import { 
  insertTicketSchema, 
  type InsertTicket,
  type Ticket,
  type KnowledgeBase 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWhitelabelContext } from "@/components/whitelabel-provider";
import LiveChatWidget from "@/components/live-chat-widget";

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

const statusColors = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "in-progress": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

const statusIcons = {
  open: Clock,
  "in-progress": AlertCircle,
  resolved: CheckCircle,
  closed: CheckCircle
};

export default function PublicHome() {
  const { toast } = useToast();
  const { config: whitelabelConfig } = useWhitelabelContext();
  
  // Get chat enabled setting from public settings
  const { data: chatSettings } = useQuery({
    queryKey: ["/api/public/settings/chat"]
  });
  
  const isChatEnabled = chatSettings?.enabled === true;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"id" | "email">("id");
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [kbSearchQuery, setKbSearchQuery] = useState("");
  const [selectedKbCategory, setSelectedKbCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBase | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InsertTicket>({
    resolver: zodResolver(insertTicketSchema),
    defaultValues: {
      priority: "medium",
      channel: "email"
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: InsertTicket) => {
      return apiRequest("POST", "/api/tickets", data);
    },
    onSuccess: async (response) => {
      const ticket = await response.json();
      toast({
        title: "Ticket Created!",
        description: `Your ticket #${ticket.id || 'ID'} has been created successfully. You'll receive email updates.`,
      });
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const searchTicketsMutation = useMutation({
    mutationFn: async ({ query, type }: { query: string; type: "id" | "email" }) => {
      const endpoint = type === "id" 
        ? `/api/public/tickets/${query}`
        : `/api/public/tickets/search?email=${encodeURIComponent(query)}`;
      
      const response = await apiRequest("GET", endpoint);
      return response.json();
    },
    onSuccess: (data) => {
      const tickets = Array.isArray(data) ? data : [data];
      setSearchResults(tickets.filter(Boolean));
      
      if (tickets.length === 0) {
        toast({
          title: "No tickets found",
          description: "No tickets match your search criteria.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Search Error",
        description: error.message || "Failed to search tickets. Please try again.",
        variant: "destructive",
      });
      setSearchResults([]);
    },
  });

  const onSubmit = (data: InsertTicket) => {
    createTicketMutation.mutate(data);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a ticket ID or email address to search.",
        variant: "destructive",
      });
      return;
    }
    
    searchTicketsMutation.mutate({ 
      query: searchQuery.trim(), 
      type: searchType 
    });
  };

  const watchedPriority = watch("priority");
  const watchedChannel = watch("channel");

  // Knowledge Base queries
  const { data: kbCategories = [] } = useQuery<string[]>({
    queryKey: ["/api/public/kb/categories"]
  });

  const { data: kbArticles = [], isLoading: kbLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/public/kb", { 
      category: selectedKbCategory !== "all" ? selectedKbCategory : undefined,
      search: kbSearchQuery || undefined
    }],
    queryFn: async () => {
      let url = "/api/public/kb";
      const params = new URLSearchParams();
      
      if (selectedKbCategory !== "all") {
        params.set("category", selectedKbCategory);
      }
      if (kbSearchQuery) {
        params.set("search", kbSearchQuery);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch articles");
      return response.json();
    }
  });

  const rateArticleMutation = useMutation({
    mutationFn: async ({ id, helpful }: { id: string; helpful: boolean }) => {
      return apiRequest("POST", `/api/public/kb/${id}/rate`, { helpful });
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your feedback has been recorded.",
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              {whitelabelConfig?.logoUrl ? (
                <img
                  src={whitelabelConfig.logoUrl}
                  alt={whitelabelConfig.companyName || "Logo"}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ 
                    backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6' 
                  }}
                >
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
              )}
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {whitelabelConfig?.companyName || "SupportHub"}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/customer/login">
                <Button size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Customer Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How can we help you today?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Submit a support ticket or check the status of your existing requests. 
            {whitelabelConfig?.companyName ? `${whitelabelConfig.companyName} team is` : 'Our team is'} here to help you resolve any issues quickly.
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="kb" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
            <TabsTrigger value="create">Create Ticket</TabsTrigger>
            <TabsTrigger value="status">Check Status</TabsTrigger>
          </TabsList>

          <TabsContent value="kb" className="space-y-6">
            {selectedArticle ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedArticle(null)}
                      >
                        ← Back to Articles
                      </Button>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{selectedArticle.views} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{selectedArticle.updatedAt ? new Date(selectedArticle.updatedAt).toLocaleDateString() : 'Unknown date'}</span>
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{selectedArticle.category}</Badge>
                      {selectedArticle.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <div style={{ whiteSpace: 'pre-line' }}>
                        {selectedArticle.content}
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t">
                      <h4 className="text-lg font-semibold mb-4">Was this article helpful?</h4>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          onClick={() => rateArticleMutation.mutate({ id: selectedArticle.id, helpful: true })}
                          disabled={rateArticleMutation.isPending}
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Yes ({selectedArticle.helpful || 0})
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => rateArticleMutation.mutate({ id: selectedArticle.id, helpful: false })}
                          disabled={rateArticleMutation.isPending}
                        >
                          <ThumbsDown className="w-4 h-4 mr-2" />
                          No ({selectedArticle.notHelpful || 0})
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5" />
                      <span>Knowledge Base</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search articles..."
                            value={kbSearchQuery}
                            onChange={(e) => setKbSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="w-full sm:w-48">
                          <Select value={selectedKbCategory} onValueChange={setSelectedKbCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {kbCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {kbLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading articles...</p>
                  </div>
                ) : kbArticles.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No articles found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try adjusting your search or browse different categories.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {kbArticles.map((article) => (
                      <Card 
                        key={article.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <Badge variant="secondary">{article.category}</Badge>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Eye className="w-3 h-3" />
                              <span>{article.views}</span>
                            </div>
                          </div>
                          <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                            {article.title}
                          </h3>
                          {article.summary && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                              {article.summary}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {article.tags?.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <ThumbsUp className="w-3 h-3" />
                                <span>{article.helpful || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <ThumbsDown className="w-3 h-3" />
                                <span>{article.notHelpful || 0}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="w-5 h-5" />
                  <span>Submit Support Request</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Your Name</Label>
                      <Input
                        id="customerName"
                        placeholder="John Doe"
                        {...register("customerName")}
                        className={errors.customerName ? "border-red-500" : ""}
                      />
                      {errors.customerName && (
                        <p className="text-sm text-red-600">{errors.customerName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="customerContact">Email Address</Label>
                      <Input
                        id="customerContact"
                        type="email"
                        placeholder="john@example.com"
                        {...register("customerContact")}
                        className={errors.customerContact ? "border-red-500" : ""}
                      />
                      {errors.customerContact && (
                        <p className="text-sm text-red-600">{errors.customerContact.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      {...register("subject")}
                      className={errors.subject ? "border-red-500" : ""}
                    />
                    {errors.subject && (
                      <p className="text-sm text-red-600">{errors.subject.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Please provide detailed information about your issue..."
                      rows={5}
                      {...register("description")}
                      className={errors.description ? "border-red-500" : ""}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600">{errors.description.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="attachments">Attachments (Optional)</Label>
                    <div className="mt-1">
                      <Input
                        id="attachments"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip"
                        className="file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum file size: 10MB. Supported formats: JPG, PNG, PDF, DOC, TXT, ZIP
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={watchedPriority}
                        onValueChange={(value) => setValue("priority", value as "low" | "medium" | "high")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - General question</SelectItem>
                          <SelectItem value="medium">Medium - Issue affecting work</SelectItem>
                          <SelectItem value="high">High - Urgent issue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="channel">How did you contact us?</Label>
                      <Select
                        value={watchedChannel}
                        onValueChange={(value) => setValue("channel", value as "email" | "whatsapp" | "twitter" | "facebook")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="twitter">Twitter/X</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createTicketMutation.isPending}
                    >
                      {createTicketMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Ticket...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Ticket
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>Check Ticket Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="searchType">Search by</Label>
                    <Select value={searchType} onValueChange={(value: "id" | "email") => setSearchType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Ticket ID</SelectItem>
                        <SelectItem value="email">Email Address</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="searchQuery">
                      {searchType === "id" ? "Ticket ID" : "Email Address"}
                    </Label>
                    <Input
                      id="searchQuery"
                      placeholder={searchType === "id" ? "Enter ticket ID..." : "Enter your email address..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>

                  <Button
                    onClick={handleSearch}
                    className="w-full"
                    disabled={searchTicketsMutation.isPending}
                  >
                    {searchTicketsMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Search Tickets
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-w-4xl mx-auto space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {searchResults.length === 1 ? "Ticket Found" : `${searchResults.length} Tickets Found`}
                </h3>
                {searchResults.map((ticket) => {
                  const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons];
                  return (
                    <Card key={ticket.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {ticket.subject}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Ticket #{ticket.id}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {ticket.status.replace("-", " ").toUpperCase()}
                            </Badge>
                            <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                              {ticket.priority.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {ticket.description}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <strong>Created:</strong> {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Unknown'}
                          </div>
                          <div>
                            <strong>Channel:</strong> {ticket.channel.charAt(0).toUpperCase() + ticket.channel.slice(1)}
                          </div>
                          <div>
                            <strong>Customer:</strong> {ticket.customerName || ticket.customerContact}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Contact Information */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {whitelabelConfig?.contactSectionTitle || "Need immediate assistance?"}
          </h3>
          <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
              <Mail className="w-5 h-5" />
              <span>{whitelabelConfig?.supportEmail || "support@supporthub.com"}</span>
            </div>
            {whitelabelConfig?.isPhoneNumberEnabled && (
              <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-5 h-5" />
                <span>{whitelabelConfig?.supportPhone || "1-800-SUPPORT"}</span>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {whitelabelConfig?.footerText || "Powered by SupportHub"}
          </div>
        </div>
      </footer>
      
      {/* Live Chat Widget */}
      {isChatEnabled && <LiveChatWidget />}
    </div>
  );
}