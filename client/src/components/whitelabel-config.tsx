import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  insertWhitelabelConfigSchema, 
  type InsertWhitelabelConfig,
  type WhitelabelConfig 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Palette, Save, Eye, Upload } from "lucide-react";
import ColorPicker from "@/components/color-picker";
import ThemePreview from "@/components/theme-preview";

interface WhitelabelConfigProps {
  config?: WhitelabelConfig | null;
}

export default function WhitelabelConfigForm({ config }: WhitelabelConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewMode, setPreviewMode] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InsertWhitelabelConfig>({
    resolver: zodResolver(insertWhitelabelConfigSchema),
    defaultValues: {
      companyName: config?.companyName || "SupportHub",
      logoUrl: config?.logoUrl || "",
      primaryColor: config?.primaryColor || "#3b82f6",
      secondaryColor: config?.secondaryColor || "#64748b",
      accentColor: config?.accentColor || "#10b981",
      customDomain: config?.customDomain || "",
      supportEmail: config?.supportEmail || "",
      supportPhone: config?.supportPhone || "",
      contactSectionTitle: config?.contactSectionTitle || "",
      faviconUrl: config?.faviconUrl || "",
      customCss: config?.customCss || "",
      footerText: config?.footerText || "Powered by SupportHub",
      isActive: config?.isActive || true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertWhitelabelConfig) => {
      return apiRequest("POST", "/api/admin/whitelabel", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whitelabel"] });
      toast({
        title: "Success",
        description: "Whitelabel configuration created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create whitelabel configuration",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertWhitelabelConfig) => {
      if (!config?.id) throw new Error("No configuration ID");
      return apiRequest("PATCH", `/api/admin/whitelabel/${config.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whitelabel"] });
      toast({
        title: "Success",
        description: "Whitelabel configuration updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update whitelabel configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertWhitelabelConfig) => {
    if (config?.id) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const watchedValues = watch();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Palette className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Whitelabel Configuration</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? "Hide" : "Show"} Preview
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        {...register("companyName")}
                        className={errors.companyName ? "border-red-500" : ""}
                      />
                      {errors.companyName && (
                        <p className="text-sm text-red-600">{errors.companyName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        placeholder="support@your-company.com"
                        {...register("supportEmail")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="supportPhone">Support Phone</Label>
                      <Input
                        id="supportPhone"
                        type="tel"
                        placeholder="1-800-SUPPORT"
                        {...register("supportPhone")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactSectionTitle">Contact Section Title</Label>
                      <Input
                        id="contactSectionTitle"
                        placeholder="Need immediate assistance?"
                        {...register("contactSectionTitle")}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        This text appears above the contact information on the home page
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="customDomain">Custom Domain</Label>
                      <Input
                        id="customDomain"
                        placeholder="support.yourcompany.com"
                        {...register("customDomain")}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={watchedValues.isActive || false}
                        onCheckedChange={(checked) => setValue("isActive", checked)}
                      />
                      <Label htmlFor="isActive">Enable Whitelabel</Label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="branding" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Visual Branding</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://your-domain.com/logo.png"
                        {...register("logoUrl")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="faviconUrl">Favicon URL</Label>
                      <Input
                        id="faviconUrl"
                        placeholder="https://your-domain.com/favicon.ico"
                        {...register("faviconUrl")}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <ColorPicker
                        label="Primary Color"
                        value={watchedValues.primaryColor || "#3b82f6"}
                        onChange={(color) => setValue("primaryColor", color)}
                        showPresets={true}
                        showHistory={true}
                      />

                      <ColorPicker
                        label="Secondary Color"
                        value={watchedValues.secondaryColor || "#64748b"}
                        onChange={(color) => setValue("secondaryColor", color)}
                        showPresets={true}
                        showHistory={true}
                      />

                      <ColorPicker
                        label="Accent Color"
                        value={watchedValues.accentColor || "#10b981"}
                        onChange={(color) => setValue("accentColor", color)}
                        showPresets={true}
                        showHistory={true}
                      />
                    </div>

                    <div>
                      <Label htmlFor="footerText">Footer Text</Label>
                      <Input
                        id="footerText"
                        placeholder="Powered by SupportHub"
                        {...register("footerText")}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Customization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="customCss">Custom CSS</Label>
                      <Textarea
                        id="customCss"
                        placeholder="/* Add your custom CSS here */"
                        rows={8}
                        {...register("customCss")}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-6">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : config?.id
                  ? "Update Configuration"
                  : "Create Configuration"}
              </Button>
            </div>
          </form>
        </div>

        {/* Enhanced Preview */}
        {previewMode && (
          <ThemePreview
            primaryColor={watchedValues.primaryColor || "#3b82f6"}
            secondaryColor={watchedValues.secondaryColor || "#64748b"}
            accentColor={watchedValues.accentColor || "#10b981"}
            companyName={watchedValues.companyName || "SupportHub"}
            logoUrl={watchedValues.logoUrl || undefined}
          />
        )}
        
        {/* Legacy Preview for fallback */}
        {false && previewMode && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-4 space-y-4"
                  style={{ 
                    background: `linear-gradient(135deg, ${watchedValues.primaryColor}10, ${watchedValues.secondaryColor}10)`
                  }}
                >
                  {/* Mock Header */}
                  <div 
                    className="flex items-center space-x-2 p-3 rounded"
                    style={{ backgroundColor: watchedValues.primaryColor || "#3b82f6" }}
                  >
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {watchedValues.companyName?.charAt(0) || "S"}
                      </span>
                    </div>
                    <span className="text-white font-semibold">
                      {watchedValues.companyName}
                    </span>
                  </div>

                  {/* Mock Content */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>

                  {/* Mock Button */}
                  <button 
                    className="px-4 py-2 rounded text-white"
                    style={{ backgroundColor: watchedValues.accentColor || "#10b981" }}
                  >
                    Sample Button
                  </button>

                  {/* Mock Footer */}
                  <div className="text-xs text-gray-500 pt-4 border-t">
                    {watchedValues.footerText}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}