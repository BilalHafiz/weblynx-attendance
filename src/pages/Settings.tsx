import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase.ts";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";

interface AdminData {
  name: string;
  email: string;
  companyName?: string;
  updatedAt?: any;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user: authUser, logout, changePassword: changePasswordApi } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminData, setAdminData] = useState<AdminData>({
    name: "",
    email: ""
  });
  const [originalEmail, setOriginalEmail] = useState<string>("");
  
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    fetchAdminData();
  }, [authUser]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      if (!authUser) {
        toast({
          title: "Not Authenticated",
          description: "Please login to access settings",
          variant: "destructive",
        });
        return;
      }

      const userId = authUser.uid;
      const adminDocRef = doc(db, "users", userId);
      const adminDocSnap = await getDoc(adminDocRef);

      if (adminDocSnap.exists()) {
        const data = adminDocSnap.data();
        const email = data.email || authUser.email || "";
        setAdminData({
          name: data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : "") || "",
          email: email,
          companyName: data.companyName || ""
        });
        setOriginalEmail(email);
      } else {
        const email = authUser.email || "";
        setAdminData({
          name: authUser.name || "",
          email: email
        });
        setOriginalEmail(email);
        await setDoc(adminDocRef, {
          name: authUser.name || "",
          email: email,
          role: "admin",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AdminData, value: string) => {
    setAdminData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePasswordChange = () => {
    if (!passwords.currentPassword) {
      toast({
        title: "Current Password Required",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return false;
    }

    if (!passwords.newPassword) {
      toast({
        title: "New Password Required",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return false;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return false;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirm password must match",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handlePasswordUpdate = async () => {
    if (!validatePasswordChange()) return;
    try {
      setSaving(true);
      const result = await changePasswordApi(passwords.currentPassword, passwords.newPassword);
      if (result.success) {
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        toast({
          title: "Password Updated",
          description: "Your password has been changed. You will be redirected to login.",
        });
        await logout();
        setTimeout(() => navigate("/", { replace: true }), 1500);
      } else {
        toast({
          title: "Password Update Failed",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!authUser) {
      toast({
        title: "Not Authenticated",
        description: "Please login to save settings",
        variant: "destructive",
      });
      return;
    }

    if (!adminData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!adminData.email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const userId = authUser.uid;
      const adminDocRef = doc(db, "users", userId);

      const adminDocSnap = await getDoc(adminDocRef);

      // Update Firestore users table
      const updateData = {
        name: adminData.name,
        email: adminData.email,
        ...(adminData.companyName && { companyName: adminData.companyName }),
        updatedAt: serverTimestamp()
      };

      if (adminDocSnap.exists()) {
        await updateDoc(adminDocRef, updateData);
      } else {
        await setDoc(adminDocRef, {
          ...updateData,
          role: "admin",
          createdAt: serverTimestamp()
        });
      }

      toast({
        title: "Settings Saved",
        description: "Your profile has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!authUser) {
      toast({
        title: "Not Authenticated",
        description: "Please login to save settings",
        variant: "destructive",
      });
      return;
    }

    const passwordChanged = passwords.newPassword && passwords.confirmPassword;
    if (passwordChanged && !validatePasswordChange()) return;
    if (passwordChanged && !passwords.currentPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your current password to change password",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const userId = authUser.uid;
      const adminDocRef = doc(db, "users", userId);
      const adminDocSnap = await getDoc(adminDocRef);
      const updateData = {
        name: adminData.name,
        email: adminData.email,
        ...(adminData.companyName && { companyName: adminData.companyName }),
        updatedAt: serverTimestamp()
      };

      if (adminDocSnap.exists()) {
        await updateDoc(adminDocRef, updateData);
      } else {
        await setDoc(adminDocRef, {
          ...updateData,
          role: "admin",
          createdAt: serverTimestamp()
        });
      }

      if (passwordChanged) {
        const result = await changePasswordApi(passwords.currentPassword, passwords.newPassword);
        if (!result.success) {
          toast({
            title: "Profile saved, password update failed",
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Settings Saved",
            description: "Your profile and password have been updated. Redirecting to login.",
          });
          await logout();
          setTimeout(() => navigate("/", { replace: true }), 1500);
        }
      } else {
        toast({
          title: "Settings Saved",
          description: "Your profile has been updated successfully",
        });
      }

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="Loading your settings...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="space-y-6">
        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Profile Settings
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input 
                  id="name" 
                  value={adminData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={adminData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@company.com"
                />
                {adminData.email !== originalEmail && originalEmail && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    <span className="font-semibold">Note:</span> Changing email requires your current password in the Security section below.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Security
            </CardTitle>
            <CardDescription>Change your account password securely</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password *</Label>
              <div className="relative">
                <Input 
                  id="currentPassword" 
                  type={showPasswords.current ? "text" : "password"} 
                  value={passwords.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  size="icon"
                  className="absolute right-2 top-1/2 bg-transparent hover:bg-transparent text-white transform -translate-y-1/2 h-6 w-6"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showPasswords.new ? "text" : "password"} 
                    value={passwords.newPassword}
                    onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="absolute right-2 top-1/2 bg-transparent hover:bg-transparent text-white transform -translate-y-1/2 h-6 w-6"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showPasswords.confirm ? "text" : "password"} 
                    value={passwords.confirmPassword}
                    onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="absolute right-2 top-1/2 bg-transparent hover:bg-transparent text-white transform -translate-y-1/2 h-6 w-6"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-white">
                <span className="font-semibold">Security Note:</span> 
                {" "}Password changes require re-authentication with your current password.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            size="lg"
            onClick={() => {
              fetchAdminData();
              setPasswords({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
              });
              toast({
                title: "Form Reset",
                description: "All changes have been reset",
              });
            }}
            disabled={saving}
          >
            Reset
          </Button>
          <Button 
            onClick={handleSaveAll} 
            variant="gradient" 
            size="lg"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;