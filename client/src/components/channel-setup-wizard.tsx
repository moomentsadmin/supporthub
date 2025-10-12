import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  MessageSquare, 
  Twitter, 
  Facebook, 
  Phone, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  AlertCircle,
  Info
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

type ChannelType = "email" | "whatsapp" | "twitter" | "facebook" | "sms";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  required?: boolean;
}

interface ChannelSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (channelData: any) => void;
}

const channelSteps: Record<ChannelType, WizardStep[]> = {
  email: [
    { id: "basic", title: "Basic Information", description: "Channel name and provider" },
    { id: "inbound", title: "Incoming Email", description: "IMAP server configuration", required: true },
    { id: "outbound", title: "Outgoing Email", description: "SMTP server configuration", required: true },
    { id: "test", title: "Test Connection", description: "Verify your settings" },
    { id: "complete", title: "Complete", description: "Review and finish setup" }
  ],
  sms: [
    { id: "basic", title: "Basic Information", description: "Channel name and provider" },
    { id: "twilio", title: "Twilio Configuration", description: "API credentials and phone number", required: true },
    { id: "test", title: "Test Connection", description: "Verify your settings" },
    { id: "complete", title: "Complete", description: "Review and finish setup" }
  ],
  whatsapp: [
    { id: "basic", title: "Basic Information", description: "Channel name and provider" },
    { id: "whatsapp", title: "WhatsApp Business", description: "Business API configuration", required: true },
    { id: "test", title: "Test Connection", description: "Verify your settings" },
    { id: "complete", title: "Complete", description: "Review and finish setup" }
  ],
  twitter: [
    { id: "basic", title: "Basic Information", description: "Channel name and provider" },
    { id: "twitter", title: "Twitter API", description: "Developer credentials", required: true },
    { id: "test", title: "Test Connection", description: "Verify your settings" },
    { id: "complete", title: "Complete", description: "Review and finish setup" }
  ],
  facebook: [
    { id: "basic", title: "Basic Information", description: "Channel name and provider" },
    { id: "facebook", title: "Facebook Page", description: "Page access token", required: true },
    { id: "test", title: "Test Connection", description: "Verify your settings" },
    { id: "complete", title: "Complete", description: "Review and finish setup" }
  ]
};

const channelIcons = {
  email: Mail,
  whatsapp: MessageSquare,
  twitter: Twitter,
  facebook: Facebook,
  sms: Phone,
};

const channelDescriptions = {
  email: "Connect your email accounts to receive and respond to customer inquiries via email.",
  sms: "Enable SMS messaging through Twilio to communicate with customers via text messages.",
  whatsapp: "Connect WhatsApp Business to provide customer support through WhatsApp messaging.",
  twitter: "Monitor and respond to Twitter mentions and direct messages.",
  facebook: "Manage customer interactions through Facebook Messenger and page comments."
};

export default function ChannelSetupWizard({ isOpen, onClose, onComplete }: ChannelSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<ChannelType | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const steps = selectedType ? channelSteps[selectedType] : [];
  const progress = steps.length > 0 ? (currentStep / (steps.length - 1)) * 100 : 0;

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleTypeSelect = (type: ChannelType) => {
    setSelectedType(type);
    setCurrentStep(0);
    setFormData({ type });
    setErrors({});
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    const currentStepId = steps[currentStep]?.id;

    switch (currentStepId) {
      case "basic":
        if (!formData.name) newErrors.name = "Channel name is required";
        break;
      case "inbound":
        if (!formData.inboundServer) newErrors.inboundServer = "IMAP server is required";
        if (!formData.inboundPort) newErrors.inboundPort = "Port is required";
        if (!formData.inboundUsername) newErrors.inboundUsername = "Username is required";
        if (!formData.inboundPassword) newErrors.inboundPassword = "Password is required";
        break;
      case "outbound":
        if (!formData.outboundServer) newErrors.outboundServer = "SMTP server is required";
        if (!formData.outboundPort) newErrors.outboundPort = "Port is required";
        if (!formData.outboundUsername) newErrors.outboundUsername = "Username is required";
        if (!formData.outboundPassword) newErrors.outboundPassword = "Password is required";
        break;
      case "twilio":
        if (!formData.twilioAccountSid) newErrors.twilioAccountSid = "Account SID is required";
        if (!formData.twilioAuthToken) newErrors.twilioAuthToken = "Auth Token is required";
        if (!formData.twilioPhoneNumber) newErrors.twilioPhoneNumber = "Phone Number is required";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    handleNext();
  };

  const handleComplete = () => {
    const channelData = {
      name: formData.name,
      type: selectedType,
      provider: formData.provider || "custom",
      config: {},
      inboundSettings: {},
      outboundSettings: {},
      isActive: true,
      isOnline: false,
    };

    // Structure data based on channel type
    if (selectedType === "email") {
      channelData.inboundSettings = {
        server: formData.inboundServer,
        port: parseInt(formData.inboundPort),
        username: formData.inboundUsername,
        password: formData.inboundPassword,
        ssl: formData.inboundSsl !== false,
        tls: formData.inboundTls === true,
      };
      channelData.outboundSettings = {
        server: formData.outboundServer,
        port: parseInt(formData.outboundPort),
        username: formData.outboundUsername,
        password: formData.outboundPassword,
        ssl: formData.outboundSsl !== false,
        tls: formData.outboundTls === true,
      };
    } else if (selectedType === "sms") {
      channelData.config = {
        twilioAccountSid: formData.twilioAccountSid,
        twilioAuthToken: formData.twilioAuthToken,
        twilioPhoneNumber: formData.twilioPhoneNumber,
      };
    }

    onComplete(channelData);
    handleReset();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedType(null);
    setFormData({});
    setErrors({});
    setIsLoading(false);
  };

  const renderTypeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Choose Channel Type</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select the type of communication channel you want to set up
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(channelDescriptions).map(([type, description]) => {
          const Icon = channelIcons[type as ChannelType];
          return (
            <Card
              key={type}
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800"
              onClick={() => handleTypeSelect(type as ChannelType)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Icon className="w-6 h-6 text-blue-600" />
                  <CardTitle className="capitalize text-base">{type}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStepContent = () => {
    if (!selectedType || !steps[currentStep]) return null;

    const stepId = steps[currentStep].id;

    switch (stepId) {
      case "basic":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel-name">Channel Name *</Label>
              <Input
                id="channel-name"
                value={formData.name || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                placeholder={`My ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Channel`}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <Label htmlFor="provider">Provider (Optional)</Label>
              <Select 
                value={formData.provider || ""} 
                onValueChange={(value) => setFormData((prev: any) => ({ ...prev, provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {selectedType === "email" && (
                    <>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="outlook">Outlook</SelectItem>
                      <SelectItem value="yahoo">Yahoo</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </>
                  )}
                  {selectedType === "sms" && (
                    <SelectItem value="twilio">Twilio</SelectItem>
                  )}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "inbound":
        return (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Configure your incoming email server (IMAP) to receive customer messages.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="imap-server">IMAP Server *</Label>
                <Input
                  id="imap-server"
                  value={formData.inboundServer || ""}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, inboundServer: e.target.value }))}
                  placeholder="imap.gmail.com"
                  className={errors.inboundServer ? "border-red-500" : ""}
                />
                {errors.inboundServer && <p className="text-sm text-red-500 mt-1">{errors.inboundServer}</p>}
              </div>
              
              <div>
                <Label htmlFor="imap-port">Port *</Label>
                <Input
                  id="imap-port"
                  type="number"
                  value={formData.inboundPort || 993}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, inboundPort: e.target.value }))}
                  className={errors.inboundPort ? "border-red-500" : ""}
                />
                {errors.inboundPort && <p className="text-sm text-red-500 mt-1">{errors.inboundPort}</p>}
              </div>
            </div>
            
            <div>
              <Label htmlFor="imap-username">Username/Email *</Label>
              <Input
                id="imap-username"
                value={formData.inboundUsername || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, inboundUsername: e.target.value }))}
                placeholder="your-email@domain.com"
                className={errors.inboundUsername ? "border-red-500" : ""}
              />
              {errors.inboundUsername && <p className="text-sm text-red-500 mt-1">{errors.inboundUsername}</p>}
            </div>
            
            <div>
              <Label htmlFor="imap-password">Password *</Label>
              <Input
                id="imap-password"
                type="password"
                value={formData.inboundPassword || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, inboundPassword: e.target.value }))}
                placeholder="Your email password or app password"
                className={errors.inboundPassword ? "border-red-500" : ""}
              />
              {errors.inboundPassword && <p className="text-sm text-red-500 mt-1">{errors.inboundPassword}</p>}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="imap-ssl"
                  checked={formData.inboundSsl !== false}
                  onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, inboundSsl: checked }))}
                />
                <Label htmlFor="imap-ssl">SSL</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="imap-tls"
                  checked={formData.inboundTls === true}
                  onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, inboundTls: checked }))}
                />
                <Label htmlFor="imap-tls">TLS</Label>
              </div>
            </div>
          </div>
        );

      case "outbound":
        return (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Configure your outgoing email server (SMTP) to send responses to customers.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-server">SMTP Server *</Label>
                <Input
                  id="smtp-server"
                  value={formData.outboundServer || ""}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, outboundServer: e.target.value }))}
                  placeholder="smtp.gmail.com"
                  className={errors.outboundServer ? "border-red-500" : ""}
                />
                {errors.outboundServer && <p className="text-sm text-red-500 mt-1">{errors.outboundServer}</p>}
              </div>
              
              <div>
                <Label htmlFor="smtp-port">Port *</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={formData.outboundPort || 587}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, outboundPort: e.target.value }))}
                  className={errors.outboundPort ? "border-red-500" : ""}
                />
                {errors.outboundPort && <p className="text-sm text-red-500 mt-1">{errors.outboundPort}</p>}
              </div>
            </div>
            
            <div>
              <Label htmlFor="smtp-username">Username/Email *</Label>
              <Input
                id="smtp-username"
                value={formData.outboundUsername || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, outboundUsername: e.target.value }))}
                placeholder="your-email@domain.com"
                className={errors.outboundUsername ? "border-red-500" : ""}
              />
              {errors.outboundUsername && <p className="text-sm text-red-500 mt-1">{errors.outboundUsername}</p>}
            </div>
            
            <div>
              <Label htmlFor="smtp-password">Password *</Label>
              <Input
                id="smtp-password"
                type="password"
                value={formData.outboundPassword || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, outboundPassword: e.target.value }))}
                placeholder="Your email password or app password"
                className={errors.outboundPassword ? "border-red-500" : ""}
              />
              {errors.outboundPassword && <p className="text-sm text-red-500 mt-1">{errors.outboundPassword}</p>}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp-ssl"
                  checked={formData.outboundSsl !== false}
                  onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, outboundSsl: checked }))}
                />
                <Label htmlFor="smtp-ssl">SSL</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp-tls"
                  checked={formData.outboundTls === true}
                  onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, outboundTls: checked }))}
                />
                <Label htmlFor="smtp-tls">TLS</Label>
              </div>
            </div>
          </div>
        );

      case "twilio":
        return (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Enter your Twilio credentials to enable SMS messaging. You can find these in your Twilio Console.
              </AlertDescription>
            </Alert>
            
            <div>
              <Label htmlFor="twilio-sid">Account SID *</Label>
              <Input
                id="twilio-sid"
                value={formData.twilioAccountSid || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, twilioAccountSid: e.target.value }))}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={errors.twilioAccountSid ? "border-red-500" : ""}
              />
              {errors.twilioAccountSid && <p className="text-sm text-red-500 mt-1">{errors.twilioAccountSid}</p>}
            </div>
            
            <div>
              <Label htmlFor="twilio-token">Auth Token *</Label>
              <Input
                id="twilio-token"
                type="password"
                value={formData.twilioAuthToken || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, twilioAuthToken: e.target.value }))}
                placeholder="Your Twilio Auth Token"
                className={errors.twilioAuthToken ? "border-red-500" : ""}
              />
              {errors.twilioAuthToken && <p className="text-sm text-red-500 mt-1">{errors.twilioAuthToken}</p>}
            </div>
            
            <div>
              <Label htmlFor="twilio-phone">Phone Number *</Label>
              <Input
                id="twilio-phone"
                value={formData.twilioPhoneNumber || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, twilioPhoneNumber: e.target.value }))}
                placeholder="+1234567890"
                className={errors.twilioPhoneNumber ? "border-red-500" : ""}
              />
              {errors.twilioPhoneNumber && <p className="text-sm text-red-500 mt-1">{errors.twilioPhoneNumber}</p>}
            </div>
          </div>
        );

      case "test":
        return (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                We'll test your configuration to ensure everything is working correctly.
              </AlertDescription>
            </Alert>
            
            <div className="text-center py-8">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p>Testing connection...</p>
                </div>
              ) : (
                <Button onClick={handleTestConnection} size="lg">
                  Test Connection
                </Button>
              )}
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Channel Setup Complete!</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your {selectedType} channel "{formData.name}" has been configured successfully.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">Channel Summary</h4>
              <div className="text-sm space-y-1 text-left">
                <div><span className="font-medium">Name:</span> {formData.name}</div>
                <div><span className="font-medium">Type:</span> {selectedType}</div>
                <div><span className="font-medium">Provider:</span> {formData.provider || "Custom"}</div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step not implemented</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Channel Setup Wizard</DialogTitle>
        </DialogHeader>

        {!selectedType ? (
          renderTypeSelection()
        ) : (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {/* Step Navigation */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-2 min-w-0">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    index === currentStep
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : index < currentStep
                      ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      index < currentStep ? "bg-green-600 text-white" : ""
                    }`}>
                      {index < currentStep ? <Check className="w-3 h-3" /> : index + 1}
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
                    {step.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <Card>
              <CardHeader>
                <CardTitle>{steps[currentStep]?.title}</CardTitle>
                <CardDescription>{steps[currentStep]?.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleReset()}
                >
                  Start Over
                </Button>
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                {currentStep === steps.length - 1 ? (
                  <Button onClick={handleComplete}>
                    Complete Setup
                  </Button>
                ) : steps[currentStep]?.id === "test" ? (
                  <Button onClick={handleTestConnection} disabled={isLoading}>
                    {isLoading ? "Testing..." : "Test Connection"}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}