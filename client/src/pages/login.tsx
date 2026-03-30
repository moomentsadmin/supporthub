import { useState } from "react";
import { useLogin } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Headphones, ArrowRight, Loader2 } from "lucide-react";
import { useWhitelabelContext } from "@/components/whitelabel-provider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const { config: wl } = useWhitelabelContext();
  const brand = wl?.primaryColor || "#3b82f6";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col items-start justify-between w-[45%] p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(222 40% 18%) 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(ellipse at 30% 50%, ${brand}, transparent 70%)` }}
        />

        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: brand }}>
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <p className="text-lg font-bold">{wl?.companyName || "SupportHub"}</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Your support queue,<br />
            <span style={{ color: brand }}>all in one place.</span>
          </h1>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "hsl(215 20% 55%)" }}>
            Manage tickets, respond to customers, and track your performance — all from one powerful workspace.
          </p>
          <div className="space-y-3">
            {["View and manage your ticket queue", "Reply with smart templates", "Track your resolution metrics"].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: brand }} />
                <span className="text-sm" style={{ color: "hsl(215 20% 55%)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px]" style={{ color: "hsl(215 20% 48%)" }}>
          {wl?.footerText || `© ${new Date().getFullYear()} ${wl?.companyName || "SupportHub"}. All rights reserved.`}
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: brand }}>
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-foreground">{wl?.companyName || "SupportHub"}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Agent sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your agent workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="agent@supporthub.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: brand }}
            >
              {login.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                : <>Sign in<ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          {/* Hint */}
          <div className="mt-8 p-4 rounded-xl bg-muted border border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Default credentials</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Email</span>
                <code className="text-xs bg-background px-2 py-0.5 rounded border border-border font-mono">
                  agent@supporthub.com
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Password</span>
                <code className="text-xs bg-background px-2 py-0.5 rounded border border-border font-mono">
                  agent123
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
