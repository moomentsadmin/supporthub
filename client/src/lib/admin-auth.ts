import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AdminUser, AdminLoginRequest } from "@shared/schema";

export function useAdminAuth() {
  const queryClient = useQueryClient();
  
  const { data: adminUser, isLoading } = useQuery<AdminUser | null>({
    queryKey: ["/api/admin/me"],
    queryFn: async () => {
      console.log('Admin auth query executing...');
      const response = await fetch("/api/admin/me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
      });
      
      console.log('Admin auth response status:', response.status);
      
      if (response.status === 401) {
        console.log('Admin auth: returning null for 401');
        return null;
      }
      
      if (!response.ok) {
        console.error('Admin auth failed:', response.status, response.statusText);
        return null; // Don't throw error, just return null
      }
      
      const result = await response.json();
      console.log('Admin auth result:', result);
      return result;
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh
    gcTime: 60000, // 1 minute cache
  });
  
  console.log('Admin auth hook state:', { adminUser, isLoading });

  const loginMutation = useMutation({
    mutationFn: async (credentials: AdminLoginRequest) => {
      console.log("Admin login attempt with:", credentials);
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      
      console.log("Admin login response status:", response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Admin login error:", error);
        throw new Error(error.message || "Login failed");
      }
      
      const result = await response.json();
      console.log("Admin login success:", result);
      return result;
    },
    onSuccess: async (adminUser) => {
      console.log("Login successful, testing session...");
      
      // Immediately test if session works
      const authTest = await fetch("/api/admin/me", {
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      
      console.log("Auth test after login:", authTest.status);
      
      if (authTest.ok) {
        console.log("Session verified, clearing cache and redirecting...");
        queryClient.clear(); // Clear all cached queries
        
        setTimeout(() => {
          window.location.href = '/admin/dashboard'; // Go to admin dashboard
        }, 300);
      } else {
        console.error("Session test failed, retrying...");
        // Try to reload the page to establish proper session
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/admin/me"], null);
      queryClient.clear();
    },
  });

  return {
    adminUser,
    isLoading,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error?.message,
  };
}