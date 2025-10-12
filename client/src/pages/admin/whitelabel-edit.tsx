import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import WhitelabelConfigForm from "@/components/whitelabel-config";
import type { WhitelabelConfig } from "@shared/schema";

export default function WhitelabelEdit() {
  const [, setLocation] = useLocation();

  const { data: whitelabelConfig, isLoading } = useQuery<WhitelabelConfig | null>({
    queryKey: ["/api/admin/whitelabel"]
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading whitelabel configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Whitelabel Configuration
            </h1>
          </div>
        </div>
      </header>

      <div className="p-6">
        <WhitelabelConfigForm config={whitelabelConfig} />
      </div>
    </div>
  );
}