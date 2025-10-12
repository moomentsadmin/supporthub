import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Filter,
  MessageCircle,
  Toggle,
  Phone
} from "lucide-react";
import { EmailProviderSettings } from "@/components/email-provider-settings";
import AdminLayout from "@/components/admin-layout";
import { 
  insertApplicationSettingsSchema, 
  type InsertApplicationSettings,
  type ApplicationSettings 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ApplicationSettings | null>(null);

  const { data: settings = [], isLoading } = useQuery<ApplicationSettings[]>({
    queryKey: ["/api/admin/settings"]
  });

  // Get feature settings specifically
  const chatSetting = settings.find(s => s.key === 'enable_chat');
  const isChatEnabled = chatSetting?.value === 'true';
  
  const phoneNumberSetting = settings.find(s => s.key === 'enable_phone_numbers');
  const isPhoneNumberEnabled = phoneNumberSetting?.value === 'true';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InsertApplicationSettings>({
    resolver: zodResolver(insertApplicationSettingsSchema),
    defaultValues: {
      category: "general",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertApplicationSettings) => {
      return apiRequest("POST", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "Setting created successfully",
      });
      setIsCreateDialogOpen(false);
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create setting",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest("PATCH", `/api/admin/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
      setEditingSetting(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  const toggleChatMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PUT", `/api/admin/settings/enable_chat`, {
        value: enabled.toString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: `Chat ${!isChatEnabled ? 'disabled' : 'enabled'} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update chat setting",
        variant: "destructive",
      });
    },
  });

  const togglePhoneNumberMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PUT", `/api/admin/settings/enable_phone_numbers`, {
        value: enabled.toString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: `Phone numbers ${!isPhoneNumberEnabled ? 'disabled' : 'enabled'} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update phone number setting",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiRequest("DELETE", `/api/admin/settings/${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "Setting deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete setting",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertApplicationSettings) => {
    createMutation.mutate(data);
  };

  const handleEdit = (setting: ApplicationSettings) => {
    setEditingSetting(setting);
  };

  const handleUpdate = (value: string) => {
    if (!editingSetting) return;
    updateMutation.mutate({ key: editingSetting.key, value });
  };

  const handleDelete = (key: string) => {
    if (confirm("Are you sure you want to delete this setting? This action cannot be undone.")) {
      deleteMutation.mutate(key);
    }
  };

  // Filter settings based on search and category
  const filteredSettings = settings.filter((setting) => {
    const matchesSearch = setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         setting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         setting.value.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || setting.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(settings.map(s => s.category)))];

  const watchedCategory = watch("category");

  if (isLoading) {
    return (
      <AdminLayout title="Application Settings">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Application Settings">
      <div className="flex justify-end mb-6">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Setting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Setting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="key">Key</Label>
                    <Input
                      id="key"
                      placeholder="setting_key"
                      {...register("key")}
                      className={errors.key ? "border-red-500" : ""}
                    />
                    {errors.key && (
                      <p className="text-sm text-red-600">{errors.key.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="value">Value</Label>
                    <Textarea
                      id="value"
                      placeholder="Setting value"
                      rows={3}
                      {...register("value")}
                      className={errors.value ? "border-red-500" : ""}
                    />
                    {errors.value && (
                      <p className="text-sm text-red-600">{errors.value.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={watchedCategory}
                      onValueChange={(value) => setValue("category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="features">Features</SelectItem>
                        <SelectItem value="email">Email Configuration</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="notifications">Notifications</SelectItem>
                        <SelectItem value="integrations">Integrations</SelectItem>
                        <SelectItem value="appearance">Appearance</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this setting does"
                      rows={2}
                      {...register("description")}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Creating..." : "Create Setting"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search settings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Provider Configuration Section */}
        <Card className="mb-6">
          <EmailProviderSettings />
        </Card>

        {/* Feature Toggles Section */}
        <Card className="mb-6">
          <CardHeader className="glassmorphism-header border-b border-white/10">
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageCircle className="w-5 h-5" />
              <span>Feature Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                isChatEnabled 
                  ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' 
                  : 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700/50'
              }`}>
                <div className="flex items-center space-x-3">
                  <MessageCircle className={`w-5 h-5 transition-colors duration-200 ${
                    isChatEnabled ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <h3 className={`font-medium transition-colors duration-200 ${
                      isChatEnabled ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>Live Chat</h3>
                    <p className={`text-sm transition-colors duration-200 ${
                      isChatEnabled ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      Enable or disable live chat functionality for customers
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isChatEnabled}
                  onCheckedChange={(checked) => toggleChatMutation.mutate(checked)}
                  disabled={toggleChatMutation.isPending}
                />
              </div>
              
              <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                isPhoneNumberEnabled 
                  ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20' 
                  : 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700/50'
              }`}>
                <div className="flex items-center space-x-3">
                  <Phone className={`w-5 h-5 transition-colors duration-200 ${
                    isPhoneNumberEnabled ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <h3 className={`font-medium transition-colors duration-200 ${
                      isPhoneNumberEnabled ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>Phone Numbers</h3>
                    <p className={`text-sm transition-colors duration-200 ${
                      isPhoneNumberEnabled ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      Enable or disable phone number collection and display for customers
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPhoneNumberEnabled}
                  onCheckedChange={(checked) => togglePhoneNumberMutation.mutate(checked)}
                  disabled={togglePhoneNumberMutation.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings List */}
        <Card>
          <CardHeader>
            <CardTitle>Settings ({filteredSettings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSettings.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm || selectedCategory !== "all" ? "No matching settings" : "No settings configured"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchTerm || selectedCategory !== "all" 
                    ? "Try adjusting your search or filter criteria."
                    : "Create your first application setting to get started."
                  }
                </p>
                {!searchTerm && selectedCategory === "all" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Setting
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSettings.map((setting) => (
                  <div key={setting.key} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {setting.key}
                          </h4>
                          <Badge variant="secondary">
                            {setting.category}
                          </Badge>
                        </div>
                        {setting.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {setting.description}
                          </p>
                        )}
                        {editingSetting?.key === setting.key ? (
                          <div className="space-y-2">
                            <Textarea
                              defaultValue={setting.value}
                              rows={3}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && e.ctrlKey) {
                                  handleUpdate((e.target as HTMLTextAreaElement).value);
                                } else if (e.key === "Escape") {
                                  setEditingSetting(null);
                                }
                              }}
                              className="text-sm"
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const textarea = document.querySelector(`textarea`) as HTMLTextAreaElement;
                                  handleUpdate(textarea.value);
                                }}
                                disabled={updateMutation.isPending}
                              >
                                {updateMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSetting(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded border">
                            {setting.value}
                          </div>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Updated: {setting.updatedAt ? new Date(setting.updatedAt).toLocaleDateString() : 'Unknown'}</span>
                          {setting.updatedBy && (
                            <span>By: {setting.updatedBy}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(setting)}
                          disabled={editingSetting?.key === setting.key}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(setting.key)}
                          disabled={deleteMutation.isPending}
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
      </div>
    </div>
  );
}