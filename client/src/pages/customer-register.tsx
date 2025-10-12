import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { customerRegisterSchema, type CustomerRegisterRequest } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useWhitelabelContext } from '@/components/whitelabel-provider';
import { Bot } from 'lucide-react';

export default function CustomerRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { config: whitelabelConfig } = useWhitelabelContext();
  
  const form = useForm<CustomerRegisterRequest>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: CustomerRegisterRequest) => {
      return apiRequest('POST', '/api/customer/register', data);
    },
    onSuccess: () => {
      toast({
        title: 'Account created!',
        description: 'Your account has been created and you are now logged in.',
      });
      setLocation('/customer/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Unable to create account',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CustomerRegisterRequest) => {
    registerMutation.mutate(data);
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
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Sign up to track your support tickets
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

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
                placeholder="Create a password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                {...form.register('phone')}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={registerMutation.isPending}
              style={{ 
                backgroundColor: whitelabelConfig?.primaryColor || '#3b82f6',
                color: 'white'
              }}
            >
              {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button 
                onClick={() => setLocation('/customer/login')}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}