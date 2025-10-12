import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { WhitelabelConfig } from "@shared/schema";

export function useWhitelabel() {
  const { data: config, isLoading, error } = useQuery<WhitelabelConfig | null>({
    queryKey: ["/api/public/whitelabel"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });

  // Apply CSS variables when config changes
  useEffect(() => {
    if (config?.isActive) {
      const root = document.documentElement;
      
      // Convert hex to HSL for CSS variables
      const hexToHsl = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };

      // Apply primary color
      if (config.primaryColor) {
        root.style.setProperty('--primary', hexToHsl(config.primaryColor));
      }

      // Apply secondary color
      if (config.secondaryColor) {
        root.style.setProperty('--secondary', hexToHsl(config.secondaryColor));
      }

      // Apply accent color
      if (config.accentColor) {
        root.style.setProperty('--accent', hexToHsl(config.accentColor));
      }

      // Apply custom CSS if provided
      if (config.customCss) {
        let styleElement = document.getElementById('whitelabel-custom-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'whitelabel-custom-css';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = config.customCss;
      }

      // Update favicon if provided
      if (config.faviconUrl) {
        let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = config.faviconUrl;
      }

      // Update page title based on current route and company name
      const path = window.location.pathname;
      let title = config.companyName || 'SupportHub';
      
      if (path.startsWith('/admin')) {
        title = `${title} - Admin Portal`;
      } else if (path.startsWith('/agents')) {
        title = `${title} - Agent Portal`;
      } else if (path.startsWith('/customer')) {
        title = `${title} - Customer Portal`;
      } else if (path === '/') {
        title = `${title} - Support Center`;
      }
      
      document.title = title;
    }
  }, [config]);

  return {
    config: config && config.isActive ? config : null,
    isLoading,
    error,
    isWhitelabeled: !!(config && config.isActive),
  };
}