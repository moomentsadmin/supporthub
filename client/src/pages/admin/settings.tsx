import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/settings"]
  });

  // Get feature settings specifically
  const chatSetting = settings.find((s: any) => s.key === 'enable_chat');
  const isChatEnabled = chatSetting?.value === 'true';
  
  const phoneNumberSetting = settings.find((s: any) => s.key === 'enable_phone_numbers');
  const isPhoneNumberEnabled = phoneNumberSetting?.value === 'true';

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
        <CardContent className="space-y-4">
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
                <h4 className="font-medium text-gray-900 dark:text-white">Live Chat Widget</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enable customer chat widget on your website
                </p>
              </div>
            </div>
            <Switch
              checked={isChatEnabled}
              onCheckedChange={(checked) => {
                toast({
                  title: `Chat ${checked ? 'enabled' : 'disabled'}`,
                  description: `Live chat widget has been ${checked ? 'enabled' : 'disabled'}`,
                });
              }}
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
                <h4 className="font-medium text-gray-900 dark:text-white">Phone Number Collection</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Collect phone numbers in ticket forms
                </p>
              </div>
            </div>
            <Switch
              checked={isPhoneNumberEnabled}
              onCheckedChange={(checked) => {
                toast({
                  title: `Phone collection ${checked ? 'enabled' : 'disabled'}`,
                  description: `Phone number collection has been ${checked ? 'enabled' : 'disabled'}`,
                });
              }}
            />
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