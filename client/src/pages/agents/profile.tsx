import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { User, Mail, Phone, Calendar, Edit3, Save, X, Key, Shield } from "lucide-react";

export default function AgentProfile() {
  const { agent } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    email: agent?.email || "",
    signature: agent?.signature || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; signature: string }) => {
      return apiRequest("PATCH", "/api/agents/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("PATCH", "/api/agents/password", data);
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
      setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      name: formData.name,
      email: formData.email,
      signature: formData.signature
    });
  };

  const handleChangePassword = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    });
  };

  const handleCancel = () => {
    setFormData({
      name: agent?.name || "",
      email: agent?.email || "",
      signature: agent?.signature || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Agent Profile
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your profile information and account settings
              </p>
            </div>

            {/* Profile Overview Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal information and email signature
                    </CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={updateProfileMutation.isPending}
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={agent?.avatar || ""} alt={agent?.name} />
                    <AvatarFallback className="text-xl">
                      {agent?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {agent?.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {agent?.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Member since {new Date(agent?.createdAt || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-900 dark:text-white">{agent?.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-900 dark:text-white">{agent?.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signature">Email Signature</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This signature will be automatically added to your email replies
                  </p>
                  {isEditing ? (
                    <Textarea
                      id="signature"
                      value={formData.signature}
                      onChange={(e) => setFormData(prev => ({ ...prev, signature: e.target.value }))}
                      placeholder="Enter your email signature"
                      rows={4}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                      {agent?.signature ? (
                        <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                          {agent.signature}
                        </pre>
                      ) : (
                        <span className="text-gray-500 italic">No signature set</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Change your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending || !formData.currentPassword || !formData.newPassword}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}