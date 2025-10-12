import { useQuery } from "@tanstack/react-query";

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export function useAuth() {
  const { data: agent, isLoading, error } = useQuery<Agent>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  return {
    agent,
    isLoading,
    error,
    isAuthenticated: !!agent,
  };
}