import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminLoginSchema, type AdminLoginRequest } from "@shared/schema";
import { useAdminAuth } from "@/lib/admin-auth";
import { Shield, AlertCircle } from "lucide-react";
import { useWhitelabelContext } from "@/components/whitelabel-provider";

export default function AdminLogin() {
  const { login, isLoggingIn, loginError } = useAdminAuth();
  const { config: whitelabelConfig } = useWhitelabelContext();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginRequest>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = (data: AdminLoginRequest) => {
    console.log('Form submitted with data:', data);
    login(data);
  };

  console.log('AdminLogin component rendering');
  
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center">
          <div className="flex justify-center">
            {whitelabelConfig?.logoUrl ? (
              <img
                src={whitelabelConfig.logoUrl}
                alt={whitelabelConfig.companyName || "Logo"}
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center shadow-lg"
                style={{ backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6' }}
              >
                <Shield className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900">
            {whitelabelConfig?.companyName ? `${whitelabelConfig.companyName} Support Admin` : "Mooments Support Admin"}
          </h1>
          <p className="mt-3 text-lg text-gray-700">
            Administrator Access Portal
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Manage agents, settings, and application configuration
          </p>
        </div>

        <Card className="shadow-lg border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-semibold text-gray-800">Administrator Login</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Enter your admin credentials to continue
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  {...register("email")}
                  className={`bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${errors.email ? "border-red-500" : ""}`}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={`bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${errors.password ? "border-red-500" : ""}`}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full text-white font-semibold py-3 text-base"
                disabled={isLoggingIn}
                size="lg"
                style={{ 
                  backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = whitelabelConfig?.accentColor || '#10b981';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = whitelabelConfig?.primaryColor || '#3b82f6';
                }}
              >
                {isLoggingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Access Admin Dashboard
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Default Admin Account</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Email:</span>
                      <code className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">admin@company.com</code>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Password:</span>
                      <code className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">admin123</code>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Use these credentials to access the admin dashboard
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}