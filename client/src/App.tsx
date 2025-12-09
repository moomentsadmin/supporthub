import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WhitelabelProvider } from "@/components/whitelabel-provider";
import { useAuth } from "./lib/auth";
import { useAdminAuth } from "./lib/admin-auth";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin/login";
import AdminDashboardNew from "@/pages/admin/dashboard-new";
import WhitelabelEdit from "@/pages/admin/whitelabel-edit";
import AgentNew from "@/pages/admin/agent-new";
import AgentEdit from "@/pages/admin/agent-edit";
import AdminSettings from "@/pages/admin/settings";
import AdminChannels from "@/pages/admin/channels";
import AdminBranding from "@/pages/admin/branding";
import AdminLogs from "@/pages/admin/logs";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminUsers from "@/pages/admin/admin-users";
import AdminWidgetIntegration from "./pages/admin/widget-integration";
import FreshdeskImport from "@/pages/admin/freshdesk-import";
import AdminAgents from "@/pages/admin/agents";
import AdminKnowledgeBase from "@/pages/admin/knowledge-base";
import AgentDashboard from "@/pages/agents/dashboard";
import PublicHome from "@/pages/public/home";
import NotFound from "@/pages/not-found";
// Agent pages
import AgentTickets from "@/pages/agents/tickets";
import AgentMyTickets from "@/pages/agents/my-tickets";
import AgentTicketDetail from "@/pages/agents/ticket-detail";
import AgentTemplates from "@/pages/agents/templates";
import AgentReports from "@/pages/agents/reports";
import AgentChat from "@/pages/agents/chat";
import AgentProfile from "@/pages/agents/profile";
// Customer pages
import TrackTicket from "@/pages/track-ticket";
import CustomerLogin from "@/pages/customer-login";
import CustomerRegister from "@/pages/customer-register";
import CustomerForgotPassword from "@/pages/customer-forgot-password";
import CustomerResetPassword from "@/pages/customer-reset-password";
import CustomerDashboard from "@/pages/customer-dashboard";
import { ButtonFixer } from "@/components/button-fixer";

function Router() {
  const { agent, isLoading: agentLoading, error: agentError } = useAuth();
  const { adminUser, isLoading: adminLoading } = useAdminAuth();
  
  // FORCE correct path detection - this fixes the SPA routing bug
  const browserPath = window.location.pathname;
  const currentPath = browserPath === '/' && window.location.href.includes('/admin/') 
    ? window.location.href.split(window.location.origin)[1] 
    : browserPath;
    
  const isAdminRoute = currentPath.startsWith('/admin');
  const isAgentRoute = currentPath.startsWith('/agents');
  
  // Enhanced debugging
  console.log('🔍 FIXED ROUTING DEBUG:', {
    'browserPath': browserPath,
    'correctedPath': currentPath, 
    'fullHref': window.location.href,
    'isAdminRoute': isAdminRoute,
    'adminUser exists': !!adminUser,
    'MISMATCH DETECTED': browserPath !== currentPath
  });
  
  console.log('Router state:', {
    currentPath,
    isAdminRoute,
    isAgentRoute,
    agent: agent?.name,
    agentLoading,
    agentError: agentError?.message,
    adminLoading
  });
  
  if (agentLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading... {currentPath}</p>
        </div>
      </div>
    );
  }

  // Admin routes
  if (isAdminRoute) {
    if (!adminUser) {
      return <AdminLogin />;
    }
    
    return (
      <Switch>
        <Route path="/admin" component={AdminDashboardNew} />
        <Route path="/admin/dashboard" component={AdminDashboardNew} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/admin-users" component={AdminUsers} />
        <Route path="/admin/whitelabel/edit" component={WhitelabelEdit} />
        <Route path="/admin/agents" component={AdminAgents} />
        <Route path="/admin/agents/new" component={AgentNew} />
        <Route path="/admin/agents/:id/edit" component={AgentEdit} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/branding" component={AdminBranding} />
        <Route path="/admin/channels" component={AdminChannels} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/freshdesk-import" component={FreshdeskImport} />
        <Route path="/admin/widget" component={AdminWidgetIntegration} />
        <Route path="/admin/knowledge-base" component={AdminKnowledgeBase} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Agent routes
  if (isAgentRoute) {
    if (!agent) {
      return <Login />;
    }
    
    return (
      <Switch>
        <Route path="/agents" component={AgentDashboard} />
        <Route path="/agents/dashboard" component={AgentDashboard} />
        <Route path="/agents/tickets" component={AgentTickets} />
        <Route path="/agents/tickets/:id" component={AgentTicketDetail} />
        <Route path="/agents/my-tickets" component={AgentMyTickets} />
        <Route path="/agents/templates" component={AgentTemplates} />
        <Route path="/agents/reports" component={AgentReports} />
        <Route path="/agents/chat" component={AgentChat} />
        <Route path="/agents/profile" component={AgentProfile} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Public routes (root and others)
  return (
    <Switch>
      {/* Debug route - no auth required */}
      <Route path="/debug-logs" component={AdminLogs} />
      {/* Customer routes */}
      <Route path="/track-ticket" component={TrackTicket} />
      <Route path="/customer/login" component={CustomerLogin} />
      <Route path="/customer/register" component={CustomerRegister} />
      <Route path="/customer/forgot-password" component={CustomerForgotPassword} />
      <Route path="/customer/reset-password" component={CustomerResetPassword} />
      <Route path="/customer/dashboard" component={CustomerDashboard} />
      
      <Route path="/" component={PublicHome} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WhitelabelProvider>
        <TooltipProvider>
          <ButtonFixer />
          <Toaster />
          <Router />
        </TooltipProvider>
      </WhitelabelProvider>
    </QueryClientProvider>
  );
}

export default App;
