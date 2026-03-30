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
        description: `Your ticket #${ticket.id || 'ID'} has been created successfully.`,
      });
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket.",
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
        description: error.message || "Failed to search tickets.",
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
        description: "Please enter a ticket ID or email.",
        variant: "destructive",
      });
      return;
    }
    searchTicketsMutation.mutate({ query: searchQuery.trim(), type: searchType });
  };

  const watchedPriority = watch("priority");
  const watchedChannel = watch("channel");

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
      if (selectedKbCategory !== "all") params.set("category", selectedKbCategory);
      if (kbSearchQuery) params.set("search", kbSearchQuery);
      if (params.toString()) url += `?${params.toString()}`;
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
      toast({ title: "Thank you!", description: "Your feedback has been recorded." });
    }
  });

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10">
      {/* Dynamic Header */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              {whitelabelConfig?.logoUrl ? (
                <img src={whitelabelConfig.logoUrl} alt="Logo" className="h-8 w-auto" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <span className="text-lg font-bold tracking-tight text-foreground">
                {whitelabelConfig?.companyName || "SupportHub"}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/customer/login">
                <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground">
                  Login
                </Button>
              </Link>
              <Link href="/customer/register">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-pattern py-20 px-4">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-medium text-white/80 mb-4 animate-fade-in shadow-xl">
            <Badge className="mr-2 bg-primary/20 text-primary-foreground border-none">New</Badge>
            Integrated self-service support portal
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight animate-slide-up">
            Help Center
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto animate-slide-up [animation-delay:100ms]">
            Find answers to common questions or connect with our support team for personalized assistance.
          </p>
          
          <div className="max-w-2xl mx-auto pt-8 animate-slide-up [animation-delay:200ms]">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-2xl overflow-hidden ring-1 ring-white/10">
                <Search className="w-5 h-5 text-muted-foreground ml-3" />
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-foreground px-3 py-3 text-lg placeholder:text-muted-foreground"
                  placeholder="Search knowledge base..."
                  value={kbSearchQuery}
                  onChange={(e) => setKbSearchQuery(e.target.value)}
                />
                <Button className="rounded-xl px-6 py-6 h-auto bg-primary hover:bg-primary/90 hidden sm:flex">
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-20">
        <Tabs defaultValue="kb" className="space-y-12">
          {/* Enhanced Tabs Trigger */}
          <div className="flex justify-center">
            <TabsList className="glass inline-flex h-14 p-1.5 rounded-2xl border bg-white/50 backdrop-blur-xl shadow-xl">
              <TabsTrigger value="kb" className="rounded-xl px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="create" className="rounded-xl px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                Create Ticket
              </TabsTrigger>
              <TabsTrigger value="status" className="rounded-xl px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                Check Status
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Knowledge Base Content */}
          <TabsContent value="kb" className="animate-fade-in focus-visible:outline-none">
            {selectedArticle ? (
              <div className="max-w-4xl mx-auto animate-slide-up">
                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden overflow-y-auto max-h-[80vh]">
                  <CardHeader className="bg-muted/30 pb-8 pt-10 px-8 lg:px-12 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedArticle(null)}
                        className="w-fit rounded-xl border-dashed"
                      >
                        ← Back to Articles
                      </Button>
                      <div className="flex items-center gap-6 text-[13px] text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5 bg-background px-3 py-1 rounded-full border shadow-sm">
                          <Eye className="w-4 h-4 text-blue-500" />
                          {selectedArticle.views} views
                        </span>
                        <span className="flex items-center gap-1.5 bg-background px-3 py-1 rounded-full border shadow-sm">
                          <Clock className="w-4 h-4 text-purple-500" />
                          {selectedArticle.updatedAt ? new Date(selectedArticle.updatedAt).toLocaleDateString() : 'Active'}
                        </span>
                      </div>
                    </div>
                    <CardTitle className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 leading-tight">
                      {selectedArticle.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="px-3 py-1 rounded-lg bg-primary/10 text-primary border-none text-[12px] uppercase tracking-wider font-bold">
                        {selectedArticle.category}
                      </Badge>
                      {selectedArticle.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="px-3 py-1 rounded-lg text-[12px] font-medium text-muted-foreground border-gray-200">
                          #{tag.toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 lg:p-12">
                    <div className="prose prose-blue dark:prose-invert max-w-none">
                      <p className="text-lg text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {selectedArticle.content}
                      </p>
                    </div>
                    
                    <div className="mt-16 p-8 rounded-3xl bg-muted/30 border border-dashed border-muted-foreground/20 text-center space-y-6">
                      <h4 className="text-xl font-bold text-foreground">Was this article helpful?</h4>
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => rateArticleMutation.mutate({ id: selectedArticle.id, helpful: true })}
                          disabled={rateArticleMutation.isPending}
                          className="rounded-2xl px-8 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all shadow-sm"
                        >
                          <ThumbsUp className="w-5 h-5 mr-3 text-emerald-500" />
                          Yes ({selectedArticle.helpful || 0})
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => rateArticleMutation.mutate({ id: selectedArticle.id, helpful: false })}
                          disabled={rateArticleMutation.isPending}
                          className="rounded-2xl px-8 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all shadow-sm"
                        >
                          <ThumbsDown className="w-5 h-5 mr-3 text-red-500" />
                          No ({selectedArticle.notHelpful || 0})
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-10 animate-fade-in">
                {/* Category Filter Bar */}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button 
                    variant={selectedKbCategory === "all" ? "default" : "outline"}
                    className="rounded-full px-6"
                    onClick={() => setSelectedKbCategory("all")}
                  >
                    All Topics
                  </Button>
                  {kbCategories.map((category) => (
                    <Button 
                      key={category}
                      variant={selectedKbCategory === category ? "default" : "outline"}
                      className="rounded-full px-6 capitalize"
                      onClick={() => setSelectedKbCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                {kbLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-48 rounded-3xl skeleton" />
                    ))}
                  </div>
                ) : kbArticles.length === 0 ? (
                  <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
                    <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">No articles found</h3>
                    <p className="text-muted-foreground">Try searching for something else or browse another category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {kbArticles.map((article) => (
                      <Card 
                        key={article.id} 
                        className="group card-interactive border-none shadow-sm hover:shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden animate-slide-up"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <CardContent className="p-7">
                          <div className="flex items-center justify-between mb-4">
                            <Badge variant="outline" className="px-3 py-1 rounded-lg bg-background font-bold text-[10px] uppercase tracking-wider text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                              {article.category}
                            </Badge>
                            <span className="text-[12px] text-muted-foreground font-medium flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              {article.views}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-lg mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          {article.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-6 leading-relaxed">
                              {article.summary}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                            <span className="text-[12px] font-bold text-primary group-hover:translate-x-1 transition-transform inline-flex items-center">
                              Read Article <Send className="ml-1.5 w-3 h-3" />
                            </span>
                            <div className="flex items-center gap-3 text-[12px] font-bold text-muted-foreground/70">
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3 text-emerald-500" /> {article.helpful}
                              </span>
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

          {/* Ticket Creation Content */}
          <TabsContent value="create" className="animate-fade-in focus-visible:outline-none">
            <Card className="max-w-3xl mx-auto shadow-2xl rounded-3xl border-none overflow-hidden">
              <CardHeader className="bg-primary/5 border-b py-10 px-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-primary/20">
                  <Send className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-extrabold tracking-tight">Submit a Request</CardTitle>
                <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                  Provide as much detail as possible so our experts can assist you effectively.
                </p>
              </CardHeader>
              <CardContent className="p-8 lg:p-10">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="customerName" className="font-bold text-foreground/80">Full Name</Label>
                      <Input
                        id="customerName"
                        placeholder="John Doe"
                        {...register("customerName")}
                        className={`h-12 rounded-xl focus:ring-primary/20 ${errors.customerName ? "border-red-400 bg-red-50/30" : "bg-muted/30 border-none"}`}
                      />
                      {errors.customerName && (
                        <p className="text-[12px] font-medium text-red-500">{errors.customerName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerContact" className="font-bold text-foreground/80">Email Address</Label>
                      <Input
                        id="customerContact"
                        type="email"
                        placeholder="john@example.com"
                        {...register("customerContact")}
                        className={`h-12 rounded-xl focus:ring-primary/20 ${errors.customerContact ? "border-red-400 bg-red-50/30" : "bg-muted/30 border-none"}`}
                      />
                      {errors.customerContact && (
                        <p className="text-[12px] font-medium text-red-500">{errors.customerContact.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="font-bold text-foreground/80">Issue Subject</Label>
                    <Input
                      id="subject"
                      placeholder="e.g. Trouble accessing server logs"
                      {...register("subject")}
                      className={`h-12 rounded-xl focus:ring-primary/20 ${errors.subject ? "border-red-400 bg-red-50/30" : "bg-muted/30 border-none"}`}
                    />
                    {errors.subject && (
                      <p className="text-[12px] font-medium text-red-500">{errors.subject.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-bold text-foreground/80">Detailed Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Please explain the problem, what you've tried, and any relevant details..."
                      rows={6}
                      {...register("description")}
                      className={`rounded-2xl focus:ring-primary/20 min-h-[160px] ${errors.description ? "border-red-400 bg-red-50/30" : "bg-muted/30 border-none"}`}
                    />
                    {errors.description && (
                      <p className="text-[12px] font-medium text-red-500">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold text-foreground/80">Priority Level</Label>
                      <Select
                        value={watchedPriority}
                        onValueChange={(value) => setValue("priority", value as "low" | "medium" | "high")}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-xl">
                          <SelectItem value="low" className="rounded-xl">Low - Routine inquiry</SelectItem>
                          <SelectItem value="medium" className="rounded-xl">Medium - Issue affecting work</SelectItem>
                          <SelectItem value="high" className="rounded-xl font-bold text-red-600">High - Critical blocker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold text-foreground/80">Contact Preference</Label>
                      <Select
                        value={watchedChannel}
                        onValueChange={(value) => setValue("channel", value as any)}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-xl">
                          <SelectItem value="email" className="rounded-xl">Email</SelectItem>
                          <SelectItem value="whatsapp" className="rounded-xl">WhatsApp</SelectItem>
                          <SelectItem value="twitter" className="rounded-xl">Twitter/X</SelectItem>
                          <SelectItem value="facebook" className="rounded-xl">Facebook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button
                      type="submit"
                      className="w-full h-14 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/95 shadow-xl transition-all active:scale-[0.98]"
                      disabled={createTicketMutation.isPending}
                    >
                      {createTicketMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          Submit Now <Send className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-[12px] text-muted-foreground mt-4">
                      By submitting, you agree to our privacy policy.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ticket Status Content */}
          <TabsContent value="status" className="animate-fade-in focus-visible:outline-none">
            <div className="max-w-2xl mx-auto space-y-8 animate-slide-up">
              <Card className="shadow-2xl rounded-3xl border-none overflow-hidden bg-background">
                <CardHeader className="bg-muted/30 border-b pb-8 pt-10 px-8 text-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-blue-500/20">
                    <Search className="w-8 h-8 text-blue-500" />
                  </div>
                  <CardTitle className="text-3xl font-extrabold tracking-tight">Track Your Request</CardTitle>
                  <p className="text-muted-foreground mt-2">
                    Enter your details below to see real-time updates on your support ticket.
                  </p>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted/30 rounded-2xl">
                    <button 
                      onClick={() => setSearchType("id")}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${searchType === "id" ? "bg-white dark:bg-gray-800 shadow-md text-primary" : "text-muted-foreground"}`}
                    >
                      Ticket ID
                    </button>
                    <button 
                      onClick={() => setSearchType("email")}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${searchType === "email" ? "bg-white dark:bg-gray-800 shadow-md text-primary" : "text-muted-foreground"}`}
                    >
                      Email
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        className="h-14 rounded-2xl pr-12 text-lg bg-muted/30 border-none font-medium"
                        placeholder={searchType === "id" ? "Ex: ticket-123" : "Enter associated email..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    </div>

                    <Button
                      onClick={handleSearch}
                      className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg transition-all active:scale-[0.98]"
                      disabled={searchTicketsMutation.isPending}
                    >
                      {searchTicketsMutation.isPending ? "Searching..." : "Track My Ticket"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Search Results Refined */}
              {searchResults.length > 0 && (
                <div className="space-y-6 animate-slide-up">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-extrabold flex items-center gap-2">
                      <div className="w-2 h-6 bg-primary rounded-full" />
                      Results Found ({searchResults.length})
                    </h3>
                  </div>
                  {searchResults.map((ticket, idx) => (
                    <Card key={ticket.id} className="group card-elevated rounded-3xl border-none shadow-xl overflow-hidden mb-4 [animation-delay:calc(val(idx)*100ms)]">
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-3 border-r bg-muted/30 group-hover:bg-primary transition-colors" />
                        <CardContent className="p-7 flex-1">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                            <div className="space-y-1">
                              <h4 className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors">
                                {ticket.subject}
                              </h4>
                              <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">
                                Ticket #{ticket.id}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest ${
                                ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                                ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {ticket.status.replace("-", " ")}
                              </Badge>
                              <Badge className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest ${
                                ticket.priority === 'high' ? 'bg-red-100 text-red-700' :
                                ticket.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {ticket.priority}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-foreground/70 leading-relaxed mb-8 line-clamp-2">
                            {ticket.description}
                          </p>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 pt-6 border-t border-gray-100">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Submitted On</p>
                              <p className="text-sm font-bold">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Unknown'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Channel</p>
                              <p className="text-sm font-bold capitalize">{ticket.channel}</p>
                            </div>
                            <div className="space-y-0.5 col-span-2 lg:col-span-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer</p>
                              <p className="text-sm font-bold truncate">{ticket.customerName || 'Anonymous'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Improved Call-to-Action / Contact */}
        <div className="mt-32 relative text-center">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <h2 className="text-[160px] font-black leading-none uppercase">Support</h2>
          </div>
          <div className="relative z-10 space-y-10">
            <div className="space-y-4">
              <h3 className="text-4xl font-extrabold tracking-tight text-foreground">
                {whitelabelConfig?.contactSectionTitle || "Still have questions?"}
              </h3>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto font-medium">
                Our support experts are available around the clock to help you solve even the most complex technical challenges.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6">
              <a href={`mailto:${whitelabelConfig?.supportEmail || "support@supporthub.com"}`} className="group p-6 rounded-3xl bg-card border hover:shadow-2xl hover:border-primary transition-all duration-300 w-full max-w-sm flex items-center gap-5 text-left">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:rotate-6 transition-all">
                  <Mail className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground group-hover:text-primary transition-colors">Email Us</h4>
                  <p className="text-sm font-bold text-muted-foreground">{whitelabelConfig?.supportEmail || "support@supporthub.com"}</p>
                </div>
              </a>
              
              {whitelabelConfig?.isPhoneNumberEnabled && (
                <a href={`tel:${whitelabelConfig?.supportPhone}`} className="group p-6 rounded-3xl bg-card border hover:shadow-2xl hover:border-primary transition-all duration-300 w-full max-w-sm flex items-center gap-5 text-left">
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:-rotate-6 transition-all">
                    <Phone className="w-7 h-7 text-blue-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-foreground group-hover:text-blue-500 transition-colors">Call Support</h4>
                    <p className="text-sm font-bold text-muted-foreground">{whitelabelConfig?.supportPhone || "+1-800-SUPPORT"}</p>
                  </div>
                </a>
              )}
            </div>
            
            <div className="pt-8">
              <Button variant="link" className="text-muted-foreground font-bold hover:text-primary transition-colors">
                View detailed FAQs <BookOpen className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2 grayscale opacity-60">
            <MessageSquare className="w-5 h-5" />
            <span className="font-bold text-sm tracking-widest uppercase">SupportHub</span>
          </div>
          <div className="text-[13px] font-medium text-muted-foreground/60 text-center">
            {whitelabelConfig?.footerText || "© 2024 SupportHub. All rights reserved. Premium Customer Experience Cloud."}
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[13px] font-bold text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-4">Privacy</a>
            <a href="#" className="text-[13px] font-bold text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-4">Terms</a>
          </div>
        </div>
      </footer>
      
      {/* Live Chat Widget Integration */}
      {isChatEnabled && <LiveChatWidget />}
    </div>
  );
}
main>
      
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