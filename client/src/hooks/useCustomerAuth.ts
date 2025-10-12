import { useQuery } from "@tanstack/react-query";

export function useCustomerAuth() {
  const { data: customer, isLoading } = useQuery({
    queryKey: ["/api/customer/me"],
    queryFn: async () => {
      const res = await fetch("/api/customer/me", {
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
        console.error(`Customer auth failed: ${res.status} ${res.statusText}`);
        return null;
      }
      
      return await res.json();
    },
    retry: 1,
    staleTime: 0,
    gcTime: 60000,
  });

  return {
    customer,
    isLoading,
    isAuthenticated: !!customer,
  };
}