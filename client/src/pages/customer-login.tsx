import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { customerLoginSchema, type CustomerLoginRequest } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useWhitelabelContext } from '@/components/whitelabel-provider';
import { Bot } from 'lucide-react';

export default function CustomerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { config: whitelabelConfig } = useWhitelabelContext();
  
  const form = useForm<CustomerLoginRequest>({
    resolver: zodResolver(customerLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: CustomerLoginRequest) => {
      return apiRequest('POST', '/api/customer/login', data);
    },
    onSuccess: () => {
      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });
      setLocation('/customer/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CustomerLoginRequest) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
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
          <CardTitle className="text-2xl text-center">
            {whitelabelConfig?.companyName ? `${whitelabelConfig.companyName} Support` : "Customer Login"}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Access your support tickets and account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              <button 
                onClick={() => setLocation('/customer/forgot-password')}
                className="text-primary hover:underline"
              >
                Forgot your password?
              </button>
            </p>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button 
                onClick={() => setLocation('/customer/register')}
                className="text-primary hover:underline"
              >
                Sign up
              </button>
            </p>
            <p className="text-sm text-muted-foreground">
              <button 
                onClick={() => setLocation('/track-ticket')}
                className="text-primary hover:underline"
              >
                Track a ticket without login
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}