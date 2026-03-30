import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminLoginSchema, type AdminLoginRequest } from "@shared/schema";
import { useAdminAuth } from "@/lib/admin-auth";
import { ShieldCheck, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useWhitelabelContext } from "@/components/whitelabel-provider";

export default function AdminLogin() {
  const { login, isLoggingIn, loginError } = useAdminAuth();
  const { config: wl } = useWhitelabelContext();

  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginRequest>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = (data: AdminLoginRequest) => login(data);
  const brand = wl?.primaryColor || "#3b82f6";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel – decorative */}
      <div
        className="hidden lg:flex flex-col items-start justify-between w-[45%] p-12 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(222 40% 18%) 100%)` }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${brand}, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: brand }}
          >
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <p className="text-lg font-bold tracking-tight">{wl?.companyName || "SupportHub"}</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Powerful support,<br />
            <span style={{ color: brand }}>beautifully managed.</span>
          </h1>
          <p className="text-sm text-sidebar-text leading-relaxed max-w-xs">
            The admin portal gives you full control over agents, channels, knowledge base, and every support interaction.
          </p>

          <div className="space-y-3">
            {["Manage agents & roles", "Configure support channels", "View system-wide analytics"].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: brand }} />
                <span className="text-sm text-sidebar-text">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-sidebar-text">
          {wl?.footerText || `© ${new Date().getFullYear()} ${wl?.companyName || "SupportHub"}. All rights reserved.`}
        </p>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: brand }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-foreground">{wl?.companyName || "SupportHub"}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Admin sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access the admin dashboard</p>
          </div>

          {loginError && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                autoComplete="email"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: brand }}
            >
              {isLoggingIn ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
              ) : (
                <>Sign in<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Hint box */}
          <div className="mt-8 p-4 rounded-xl bg-muted border border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Default credentials</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Email</span>
                <code className="text-xs bg-background px-2 py-0.5 rounded border border-border font-mono">
                  admin@supporthub.com
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Password</span>
                <code className="text-xs bg-background px-2 py-0.5 rounded border border-border font-mono">
                  admin123
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}