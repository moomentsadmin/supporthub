import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { Agent, LoginRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const { data: agent, isLoading, error } = useQuery<{ agent: Agent } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        }
      });
      
      if (res.status === 401) {
        return null; // Not authenticated
      }
      
      if (!res.ok) {
        console.error(`Agent auth failed: ${res.status} ${res.statusText}`);
        return null; // Don't throw error, just return null for unauthenticated
      }
      
      return await res.json();
    },
    retry: 1,
    staleTime: 0, // Always fetch fresh
    gcTime: 60000, // 1 minute cache
  });

  // Log auth state for debugging
  console.log("Auth query state:", { data: agent, isLoading, error: error?.message });
  if (error) {
    console.warn("Auth error:", error);
  }

  return {
    agent: agent?.agent || null,
    isLoading,
    error,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.agent.name}!`,
      });
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
  });
}
