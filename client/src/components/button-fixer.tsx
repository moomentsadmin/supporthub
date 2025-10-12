import { useEffect } from 'react';

export function ButtonFixer() {
  useEffect(() => {
    // Force all buttons to be visible with JavaScript
    const forceButtonVisibility = () => {
      const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');
      
      buttons.forEach((button) => {
        const element = button as HTMLElement;
        // Apply emergency styles directly via JavaScript
        element.style.backgroundColor = '#3b82f6';
        element.style.color = 'white';
        element.style.border = '2px solid #3b82f6';
        element.style.padding = '8px 16px';
        element.style.borderRadius = '6px';
        element.style.opacity = '1';
        element.style.visibility = 'visible';
        element.style.display = 'inline-flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        element.style.fontWeight = '500';
        element.style.cursor = 'pointer';
        element.style.transition = 'all 0.2s ease-in-out';
        
        // Handle secondary variant
        if (element.className.includes('secondary')) {
          element.style.backgroundColor = '#6b7280';
          element.style.borderColor = '#6b7280';
        }
        
        // Handle destructive variant
        if (element.className.includes('destructive')) {
          element.style.backgroundColor = '#dc2626';
          element.style.borderColor = '#dc2626';
        }
        
        // Add hover effect
        element.addEventListener('mouseenter', () => {
          if (element.className.includes('secondary')) {
            element.style.backgroundColor = '#4b5563';
          } else if (element.className.includes('destructive')) {
            element.style.backgroundColor = '#b91c1c';
          } else {
            element.style.backgroundColor = '#2563eb';
          }
        });
        
        element.addEventListener('mouseleave', () => {
          if (element.className.includes('secondary')) {
            element.style.backgroundColor = '#6b7280';
          } else if (element.className.includes('destructive')) {
            element.style.backgroundColor = '#dc2626';
          } else {
            element.style.backgroundColor = '#3b82f6';
          }
        });
      });
    };
    
    // Run immediately
    forceButtonVisibility();
    
    // Run on DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(forceButtonVisibility, 100);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Run periodically as backup
    const interval = setInterval(forceButtonVisibility, 1000);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
  
  return null;
}