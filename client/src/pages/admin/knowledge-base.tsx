import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin-layout";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  BookOpen, 
  Filter,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Users
} from "lucide-react";

interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  views: number;
  helpful: number;
  notHelpful: number;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
}

const categories = [
  "Account Management",
  "Billing", 
  "Technical Support",
  "General",
  "Getting Started",
  "Troubleshooting"
];

export default function AdminKnowledgeBase() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBase | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formIsPublished, setFormIsPublished] = useState(false);

  // Fetch knowledge base articles
  const { data: articles, isLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/admin/knowledge-base"],
    refetchInterval: 30000,
  });

  // Create article mutation
  const createArticleMutation = useMutation({
    mutationFn: async (articleData: Partial<KnowledgeBase>) => {
      const response = await apiRequest("POST", "/api/admin/knowledge-base", articleData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Article Created",
        description: "Knowledge base article created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-base"] });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create article.",
        variant: "destructive",
      });
    },
  });

  // Update article mutation
  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<KnowledgeBase> }) => {
      const response = await apiRequest("PUT", `/api/admin/knowledge-base/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Article Updated",
        description: "Knowledge base article updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-base"] });
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update article.",
        variant: "destructive",
      });
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/knowledge-base/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Article Deleted",
        description: "Knowledge base article deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/knowledge-base"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete article.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormSummary("");
    setFormCategory("");
    setFormTags("");
    setFormIsPublished(false);
    setSelectedArticle(null);
  };

  const handleEdit = (article: KnowledgeBase) => {
    setSelectedArticle(article);
    setFormTitle(article.title);
    setFormContent(article.content);
    setFormSummary(article.summary || "");
    setFormCategory(article.category);
    setFormTags(article.tags?.join(", ") || "");
    setFormIsPublished(article.isPublished);
    setIsEditDialogOpen(true);
  };

  const handleCreate = () => {
    const tags = formTags.split(",").map(tag => tag.trim()).filter(Boolean);
    
    createArticleMutation.mutate({
      title: formTitle,
      content: formContent,
      summary: formSummary || undefined,
      category: formCategory,
      tags,
      isPublished: formIsPublished,
    });
  };

  const handleUpdate = () => {
    if (!selectedArticle) return;
    
    const tags = formTags.split(",").map(tag => tag.trim()).filter(Boolean);
    
    updateArticleMutation.mutate({
      id: selectedArticle.id,
      data: {
        title: formTitle,
        content: formContent,
        summary: formSummary || undefined,
        category: formCategory,
        tags,
        isPublished: formIsPublished,
      },
    });
  };

  const filteredArticles = articles?.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "published" && article.isPublished) ||
                         (statusFilter === "draft" && !article.isPublished);
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  const totalArticles = articles?.length || 0;
  const publishedArticles = articles?.filter(a => a.isPublished).length || 0;
  const totalViews = articles?.reduce((sum, a) => sum + (a.views || 0), 0) || 0;
  const avgRating = articles?.length ? 
    articles.reduce((sum, a) => sum + ((a.helpful || 0) / Math.max((a.helpful || 0) + (a.notHelpful || 0), 1)), 0) / articles.length : 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Knowledge Base</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Knowledge Base
            </h1>
            <p className="text-gray-600 mt-1">
              Manage help articles and documentation for customers
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Article</DialogTitle>
              </DialogHeader>
              <ArticleForm
                title={formTitle}
                content={formContent}
                summary={formSummary}
                category={formCategory}
                tags={formTags}
                isPublished={formIsPublished}
                onTitleChange={setFormTitle}
                onContentChange={setFormContent}
                onSummaryChange={setFormSummary}
                onCategoryChange={setFormCategory}
                onTagsChange={setFormTags}
                onIsPublishedChange={setFormIsPublished}
                onSubmit={handleCreate}
                onCancel={() => setIsCreateDialogOpen(false)}
                isSubmitting={createArticleMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Articles</p>
                  <p className="text-2xl font-bold">{totalArticles}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-2xl font-bold">{publishedArticles}</p>
                </div>
                <Eye className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold">{totalViews}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                  <p className="text-2xl font-bold">{(avgRating * 100).toFixed(0)}%</p>
                </div>
                <ThumbsUp className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Articles Table */}
        <Card>
          <CardHeader>
            <CardTitle>Articles ({filteredArticles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredArticles.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No articles found
                </h3>
                <p className="text-gray-600">
                  {totalArticles === 0 
                    ? "Create your first knowledge base article to get started."
                    : "Try adjusting your search or filters."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold">{article.title}</h3>
                          <Badge variant={article.isPublished ? "default" : "secondary"}>
                            {article.isPublished ? "Published" : "Draft"}
                          </Badge>
                          <Badge variant="outline">{article.category}</Badge>
                        </div>
                        
                        {article.summary && (
                          <p className="text-gray-600 mb-2">{article.summary}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{article.views || 0} views</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{article.helpful || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsDown className="w-4 h-4" />
                            <span>{article.notHelpful || 0}</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(article.updatedAt).toLocaleDateString()}</span>
                        </div>
                        
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {article.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(article)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteArticleMutation.mutate(article.id)}
                          disabled={deleteArticleMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Article</DialogTitle>
            </DialogHeader>
            <ArticleForm
              title={formTitle}
              content={formContent}
              summary={formSummary}
              category={formCategory}
              tags={formTags}
              isPublished={formIsPublished}
              onTitleChange={setFormTitle}
              onContentChange={setFormContent}
              onSummaryChange={setFormSummary}
              onCategoryChange={setFormCategory}
              onTagsChange={setFormTags}
              onIsPublishedChange={setFormIsPublished}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditDialogOpen(false)}
              isSubmitting={updateArticleMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

interface ArticleFormProps {
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string;
  isPublished: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onIsPublishedChange: (value: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function ArticleForm({
  title,
  content,
  summary,
  category,
  tags,
  isPublished,
  onTitleChange,
  onContentChange,
  onSummaryChange,
  onCategoryChange,
  onTagsChange,
  onIsPublishedChange,
  onSubmit,
  onCancel,
  isSubmitting
}: ArticleFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter article title"
          required
        />
      </div>

      <div>
        <Label htmlFor="summary">Summary</Label>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          placeholder="Brief description of the article"
        />
      </div>

      <div>
        <Label htmlFor="category">Category *</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="Enter tags separated by commas"
        />
      </div>

      <div>
        <Label htmlFor="content">Content *</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Enter article content"
          rows={10}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="published"
          checked={isPublished}
          onCheckedChange={onIsPublishedChange}
        />
        <Label htmlFor="published">Publish article</Label>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting || !title || !content || !category}>
          {isSubmitting ? "Saving..." : "Save Article"}
        </Button>
      </div>
    </div>
  );
}