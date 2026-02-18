import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase.ts";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { 
  updatePassword,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut
} from "firebase/auth";

interface AdminData {
  name: string;
  email: string;
  companyName?: string;
  updatedAt?: any;
}

const Settings = () => {
  const navigate = useNavigate();
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
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const authUser = auth.currentUser;
      
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
          name: data.name || data.firstName + " " + data.lastName || "",
          email: email,
          companyName: data.companyName || ""
        });
        setOriginalEmail(email);
      } else {
        const email = authUser.email || "";
        setAdminData({
          name: authUser.displayName || "",
          email: email
        });
        setOriginalEmail(email);
        
        await setDoc(adminDocRef, {
          name: authUser.displayName || "",
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

    const authUser = auth.currentUser;
    if (!authUser || !authUser.email) {
      toast({
        title: "Authentication Error",
        description: "Please login again",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const credential = EmailAuthProvider.credential(
        authUser.email,
        passwords.currentPassword
      );
      
      await reauthenticateWithCredential(authUser, credential);
      
      await updatePassword(authUser, passwords.newPassword);
      
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully. You will be redirected to login.",
      });
      
      // Sign out and redirect to login page
      await signOut(auth);
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error("Password update error:", error);
      
      if (error.code === 'auth/wrong-password') {
        toast({
          title: "Incorrect Password",
          description: "Current password is incorrect",
          variant: "destructive",
        });
      } else if (error.code === 'auth/weak-password') {
        toast({
          title: "Weak Password",
          description: "Password should be at least 6 characters",
          variant: "destructive",
        });
      } else if (error.code === 'auth/requires-recent-login') {
        toast({
          title: "Re-authentication Required",
          description: "Please login again to change password",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update password. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    const authUser = auth.currentUser;
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
      
      // Check if email has changed
      const emailChanged = adminData.email !== authUser.email;
      
      // If email changed, update Firebase Auth email (requires re-authentication)
      if (emailChanged && authUser.email) {
        // For email changes, we need current password for re-authentication
        // We'll prompt for password if email is being changed
        if (!passwords.currentPassword) {
          toast({
            title: "Password Required",
            description: "Please enter your current password to change email",
            variant: "destructive",
          });
          return;
        }

        try {
          // Re-authenticate user before updating email
          const credential = EmailAuthProvider.credential(
            authUser.email!,
            passwords.currentPassword
          );
          await reauthenticateWithCredential(authUser, credential);
          
          // Send verification email to the new email address
          // The email will be updated after the user verifies it
          await verifyBeforeUpdateEmail(authUser, adminData.email);
          
          // Note: We'll update Firestore with the new email, but Firebase Auth email
          // will only be updated after the user verifies the new email
        } catch (error: any) {
          console.error("Email update error:", error);
          
          if (error.code === 'auth/wrong-password') {
            toast({
              title: "Incorrect Password",
              description: "Current password is incorrect. Please try again.",
              variant: "destructive",
            });
            return;
          } else if (error.code === 'auth/email-already-in-use') {
            toast({
              title: "Email Already In Use",
              description: "This email is already registered with another account",
              variant: "destructive",
            });
            return;
          } else if (error.code === 'auth/invalid-email') {
            toast({
              title: "Invalid Email",
              description: "Please enter a valid email address",
              variant: "destructive",
            });
            return;
          } else if (error.code === 'auth/requires-recent-login') {
            toast({
              title: "Re-authentication Required",
              description: "Please login again to change email",
              variant: "destructive",
            });
            return;
          } else if (error.code === 'auth/operation-not-allowed') {
            toast({
              title: "Email Update Not Allowed",
              description: "Email verification is required. Please check your Firebase console settings or verify your current email first.",
              variant: "destructive",
            });
            return;
          } else {
            throw error;
          }
        }
      }
      
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

      // If email was changed, sign out and redirect to login page
      if (emailChanged) {
        toast({
          title: "Settings Saved",
          description: `Your profile and email have been updated. A verification email has been sent to ${adminData.email}. Please check your inbox and click the verification link to complete the email change. You will be redirected to login.`,
        });
        
        // Sign out and redirect to login page after email change
        await signOut(auth);
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);
      } else {
        toast({
          title: "Settings Saved",
          description: "Your profile has been updated successfully",
        });
      }
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
    const authUser = auth.currentUser;
    if (!authUser) {
      toast({
        title: "Not Authenticated",
        description: "Please login to save settings",
        variant: "destructive",
      });
      return;
    }

    // Check if both email and password are being changed
    const emailChanged = adminData.email !== authUser.email;
    const passwordChanged = passwords.newPassword && passwords.confirmPassword;
    const needsReauth = emailChanged || passwordChanged;

    // If email or password is changing, we need current password
    if (needsReauth && !passwords.currentPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your current password to make changes",
        variant: "destructive",
      });
      return;
    }

    // If both email and password are changing, handle them together
    if (emailChanged && passwordChanged) {
      if (!validatePasswordChange()) return;

      try {
        setSaving(true);
        
        // Re-authenticate once with current email and password
        const credential = EmailAuthProvider.credential(
          authUser.email!,
          passwords.currentPassword
        );
        await reauthenticateWithCredential(authUser, credential);
        
        // Send verification email for the new email address
        await verifyBeforeUpdateEmail(authUser, adminData.email);
        
        // Update password (this can be done immediately)
        await updatePassword(authUser, passwords.newPassword);
        
        // Update Firestore with new email (pending verification)
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

        // Clear password fields
        setPasswords({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });

        toast({
          title: "Settings Updated",
          description: `Password updated successfully. A verification email has been sent to ${adminData.email}. Please check your inbox and click the verification link to complete the email change. You will be redirected to login.`,
        });
        
        // Sign out and redirect to login page after email/password change
        await signOut(auth);
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);
      } catch (error: any) {
        console.error("Error saving settings:", error);
        handleAuthError(error);
      } finally {
        setSaving(false);
      }
    } else {
      // Handle email or password change separately
      if (emailChanged) {
        await handleSaveProfile();
      } else if (passwordChanged) {
        await handlePasswordUpdate();
      } else {
        // Only profile data (name, companyName) is changing
        await handleSaveProfile();
      }
    }
  };

  const handleAuthError = (error: any) => {
    if (error.code === 'auth/wrong-password') {
      toast({
        title: "Incorrect Password",
        description: "Current password is incorrect. Please try again.",
        variant: "destructive",
      });
    } else if (error.code === 'auth/email-already-in-use') {
      toast({
        title: "Email Already In Use",
        description: "This email is already registered with another account",
        variant: "destructive",
      });
    } else if (error.code === 'auth/invalid-email') {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
    } else if (error.code === 'auth/weak-password') {
      toast({
        title: "Weak Password",
        description: "Password should be at least 6 characters",
        variant: "destructive",
      });
    } else if (error.code === 'auth/requires-recent-login') {
      toast({
        title: "Re-authentication Required",
        description: "Please login again to make these changes",
        variant: "destructive",
      });
    } else if (error.code === 'auth/operation-not-allowed') {
      toast({
        title: "Email Update Not Allowed",
        description: "Email verification is required. Please check your Firebase console settings or verify your current email first.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: error.message || "Failed to update. Please try again.",
        variant: "destructive",
      });
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
              <User className="h-5 w-5 text-primary" />
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
              <Lock className="h-5 w-5 text-primary" />
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
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
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
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
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
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
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
              <p className="text-sm text-primary">
                <span className="font-semibold">Security Note:</span> 
                {" "}Password changes require re-authentication with your current password.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button 
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
            variant="outline"
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