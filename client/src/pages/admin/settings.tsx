import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Filter, MessageCircle, Phone } from "lucide-react";
import { EmailProviderSettings } from "@/components/email-provider-settings";
import AdminLayout from "@/components/admin-layout";
import WhitelabelConfigForm from "@/components/whitelabel-config";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { WhitelabelConfig } from "@shared/schema";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Local optimistic toggle state
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);
  const [phoneEnabled, setPhoneEnabled] = useState<boolean | null>(null);

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/settings"]
  });

  const { data: whitelabelConfig } = useQuery<WhitelabelConfig | null>({
    queryKey: ["/api/admin/whitelabel"]
  });

  // Sync local state from server data (only on first load / when null)
  const chatSetting = settings.find((s: any) => s.key === 'enable_chat');
  const phoneNumberSetting = settings.find((s: any) => s.key === 'enable_phone_numbers');

  useEffect(() => {
    if (chatSetting && chatEnabled === null) {
      setChatEnabled(chatSetting.value === 'true');
    }
  }, [chatSetting]);

  useEffect(() => {
    if (phoneNumberSetting && phoneEnabled === null) {
      setPhoneEnabled(phoneNumberSetting.value === 'true');
    }
  }, [phoneNumberSetting]);

  // Mutation to update a setting via API
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PUT", `/api/admin/settings/${key}`, { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (err: Error, variables) => {
      // Revert optimistic state on failure
      if (variables.key === 'enable_chat') {
        setChatEnabled(prev => !prev);
      } else if (variables.key === 'enable_phone_numbers') {
        setPhoneEnabled(prev => !prev);
      }
      toast({
        title: "Error",
        description: "Failed to update setting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChatToggle = (checked: boolean) => {
    setChatEnabled(checked); // optimistic update
    updateSetting.mutate({ key: 'enable_chat', value: String(checked) });
    toast({
      title: checked ? "Live Chat Enabled" : "Live Chat Disabled",
      description: `Live chat widget has been ${checked ? 'enabled' : 'disabled'}.`,
    });
  };

  const handlePhoneToggle = (checked: boolean) => {
    setPhoneEnabled(checked); // optimistic update
    updateSetting.mutate({ key: 'enable_phone_numbers', value: String(checked) });
    toast({
      title: checked ? "Phone Collection Enabled" : "Phone Collection Disabled",
      description: `Phone number collection has been ${checked ? 'enabled' : 'disabled'}.`,
    });
  };

  // Resolved values: use local state if set, else derive from server
  const isChatEnabled = chatEnabled !== null ? chatEnabled : (chatSetting?.value === 'true');
  const isPhoneNumberEnabled = phoneEnabled !== null ? phoneEnabled : (phoneNumberSetting?.value === 'true');

  // Filter settings based on search and category
  const filteredSettings = settings.filter((setting: any) => {
    const matchesSearch = setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         setting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         setting.value.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || setting.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(settings.map((s: any) => s.category)))];

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
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Feature Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* Live Chat Widget */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
            isChatEnabled
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                isChatEnabled ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <MessageCircle className={`w-4 h-4 ${isChatEnabled ? 'text-emerald-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">Live Chat Widget</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enable customer chat widget on your website</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                isChatEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {isChatEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={isChatEnabled}
                onCheckedChange={handleChatToggle}
                disabled={updateSetting.isPending}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-300"
              />
            </div>
          </div>

          {/* Phone Number Collection */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
            isPhoneNumberEnabled
              ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                isPhoneNumberEnabled ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <Phone className={`w-4 h-4 ${isPhoneNumberEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">Phone Number Collection</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Collect phone numbers in ticket forms</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                isPhoneNumberEnabled
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {isPhoneNumberEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={isPhoneNumberEnabled}
                onCheckedChange={handlePhoneToggle}
                disabled={updateSetting.isPending}
                className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-300"
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Application Settings ({filteredSettings.length})</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Setting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Setting</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-gray-600">
                  Settings management interface coming soon. For now, settings can be managed through the API.
                </p>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSettings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No settings found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSettings.map((setting: any) => (
                <div key={setting.key} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{setting.key}</h4>
                      <p className="text-sm text-gray-600">{setting.description || 'No description'}</p>
                    </div>
                    <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {setting.value}
                    </div>
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