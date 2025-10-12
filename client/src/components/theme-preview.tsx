import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ThemePreviewProps {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  companyName: string;
  logoUrl?: string;
}

export default function ThemePreview({ 
  primaryColor, 
  secondaryColor, 
  accentColor, 
  companyName,
  logoUrl 
}: ThemePreviewProps) {
  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardHeader>
        <CardTitle>Live Theme Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="p-6 rounded-lg"
          style={{ backgroundColor: secondaryColor + '20' }}
        >
          <div className="space-y-4">
            {logoUrl ? (
              <div className="flex items-center space-x-3">
                <img 
                  src={logoUrl} 
                  alt={`${companyName} logo`} 
                  className="h-8 w-8 object-contain"
                />
                <h2 
                  className="text-2xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {companyName || 'SupportHub'}
                </h2>
              </div>
            ) : (
              <h2 
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                {companyName || 'SupportHub'}
              </h2>
            )}
            <p className="text-gray-600">
              Welcome to our support portal. Get help with your questions and issues.
            </p>
            <div className="flex space-x-2">
              <Button 
                style={{ 
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                  color: 'white'
                }}
              >
                Primary Button
              </Button>
              <Button 
                variant="outline"
                style={{ 
                  borderColor: accentColor,
                  color: accentColor
                }}
              >
                Secondary Button
              </Button>
            </div>
            <div 
              className="p-3 rounded border-l-4"
              style={{ 
                borderLeftColor: accentColor,
                backgroundColor: accentColor + '10'
              }}
            >
              <p className="text-sm">This is how notifications and highlights will appear.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}