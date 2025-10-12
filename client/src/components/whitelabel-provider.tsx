import { createContext, useContext } from "react";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import type { WhitelabelConfig } from "@shared/schema";

interface WhitelabelContextType {
  config: WhitelabelConfig | null;
  isLoading: boolean;
  isWhitelabeled: boolean;
}

const WhitelabelContext = createContext<WhitelabelContextType>({
  config: null,
  isLoading: true,
  isWhitelabeled: false,
});

export function WhitelabelProvider({ children }: { children: React.ReactNode }) {
  const { config, isLoading, isWhitelabeled } = useWhitelabel();

  return (
    <WhitelabelContext.Provider value={{ config, isLoading, isWhitelabeled }}>
      {children}
    </WhitelabelContext.Provider>
  );
}

export const useWhitelabelContext = () => useContext(WhitelabelContext);