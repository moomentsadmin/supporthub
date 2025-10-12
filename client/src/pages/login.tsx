import { useState } from "react";
import { useLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { useWhitelabelContext } from "@/components/whitelabel-provider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const { config: whitelabelConfig } = useWhitelabelContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {whitelabelConfig?.logoUrl ? (
              <img
                src={whitelabelConfig.logoUrl}
                alt={whitelabelConfig.companyName || "Logo"}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6' }}
              >
                <Bot className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-medium text-gray-800">
            {whitelabelConfig?.companyName || "SupportHub"}
          </CardTitle>
          <CardDescription className="text-gray-600">Sign in to your agent account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                placeholder="agent@supporthub.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full text-white font-semibold py-3"
              disabled={login.isPending}
              style={{ 
                backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6',
                color: 'white'
              }}
            >
              {login.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">Demo Agent Credentials:</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Email:</span>
                <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">agent@example.com</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Password:</span>
                <code className="bg-blue-100 px-2 py-1 rounded text-blue-800">password123</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
