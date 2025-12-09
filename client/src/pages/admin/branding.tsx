import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import WhitelabelConfigForm from "@/components/whitelabel-config";
import type { WhitelabelConfig } from "@shared/schema";
import { Palette } from "lucide-react";

export default function AdminBranding() {
  const { data: whitelabelConfig, isLoading } = useQuery<WhitelabelConfig | null>({
    queryKey: ["/api/admin/whitelabel"]
  });

  if (isLoading) {
    return (
      <AdminLayout title="Branding & Whitelabel">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading branding configuration...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Branding & Whitelabel">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Palette className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customize Your Brand</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Customize the appearance of your support portal with your company's branding, colors, and logo.
        </p>
      </div>
      
      <WhitelabelConfigForm config={whitelabelConfig || undefined} />
    </AdminLayout>
  );
}
