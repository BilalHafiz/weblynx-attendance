// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { doc, getDoc } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import { useAuth } from "@/contexts/AuthContext";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { useToast } from "@/hooks/use-toast";
// import { 
//   User, 
//   Mail, 
//   Phone, 
//   Building2, 
//   Briefcase, 
//   Calendar, 
//   Lock, 
//   Eye, 
//   EyeOff,
//   ArrowLeft,
//   LogOut,
//   Shield
// } from "lucide-react";

// interface EmployeeData {
//   name: string;
//   email: string;
//   phone: string;
//   department: string;
//   designation: string;
//   joiningDate: string;
//   status: string;
// }

// export default function EmployeeSettings() {
//   const navigate = useNavigate();
//   const { toast } = useToast();
//   const { user, userRole, logout, changePassword } = useAuth();

//   const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
//   const [loading, setLoading] = useState(true);
  
//   // Password change states
//   const [currentPassword, setCurrentPassword] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [showCurrentPassword, setShowCurrentPassword] = useState(false);
//   const [showNewPassword, setShowNewPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [isChangingPassword, setIsChangingPassword] = useState(false);

//   useEffect(() => {
//     const fetchEmployeeData = async () => {
//       if (!user) {
//         setLoading(false);
//         return;
//       }

//       try {
//         const empDoc = await getDoc(doc(db, "employees", user.uid));
//         if (empDoc.exists()) {
//           setEmployeeData(empDoc.data() as EmployeeData);
//         } else {
//           // If no employee document, use auth email
//           setEmployeeData({
//             name: user.displayName || "Employee",
//             email: user.email || "",
//             phone: "",
//             department: "",
//             designation: "",
//             joiningDate: "",
//             status: "active"
//           });
//         }
//       } catch (error) {
//         console.error("Error fetching employee data:", error);
//         toast({
//           title: "Error",
//           description: "Failed to load profile data",
//           variant: "destructive"
//         });
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchEmployeeData();
//   }, [user, toast]);

//   const handlePasswordChange = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!currentPassword || !newPassword || !confirmPassword) {
//       toast({
//         title: "Error",
//         description: "Please fill all password fields",
//         variant: "destructive"
//       });
//       return;
//     }

//     if (newPassword.length < 6) {
//       toast({
//         title: "Error",
//         description: "New password must be at least 6 characters",
//         variant: "destructive"
//       });
//       return;
//     }

//     if (newPassword !== confirmPassword) {
//       toast({
//         title: "Error",
//         description: "New passwords do not match",
//         variant: "destructive"
//       });
//       return;
//     }

//     setIsChangingPassword(true);

//     const result = await changePassword(currentPassword, newPassword);

//     if (result.success) {
//       toast({
//         title: "Success",
//         description: "Password changed successfully!"
//       });
//       setCurrentPassword("");
//       setNewPassword("");
//       setConfirmPassword("");
//     } else {
//       toast({
//         title: "Error",
//         description: result.error || "Failed to change password",
//         variant: "destructive"
//       });
//     }

//     setIsChangingPassword(false);
//   };

//   const handleLogout = async () => {
//     await logout();
//     navigate("/");
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-background">
//         <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
//         <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
//           <div className="flex items-center gap-2 sm:gap-3">
//             <Button 
//               variant="ghost" 
//               size="icon" 
//               onClick={() => navigate("/employee-dashboard")}
//               className="h-8 w-8 sm:h-9 sm:w-9"
//             >
//               <ArrowLeft className="h-4 w-4" />
//             </Button>
//             <div>
//               <h1 className="font-semibold text-foreground text-sm sm:text-base">Profile & Settings</h1>
//               <p className="text-[10px] sm:text-xs text-muted-foreground">Manage your account</p>
//             </div>
//           </div>
//           <Button variant="outline" size="sm" onClick={handleLogout} className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
//             <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
//             <span className="hidden sm:inline">Logout</span>
//           </Button>
//         </div>
//       </header>

//       <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-2xl animate-fade-in">
//         {/* Profile Information Card */}
//         <Card className="shadow-card">
//           <CardHeader>
//             <CardTitle className="text-base sm:text-lg flex items-center gap-2">
//               <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
//               Profile Information
//             </CardTitle>
//             <CardDescription className="text-xs sm:text-sm">
//               Your account details (Read-only)
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {/* Email - Locked */}
//             <div className="space-y-2">
//               <Label className="text-xs sm:text-sm flex items-center gap-2">
//                 <Mail className="h-3.5 w-3.5" />
//                 Email
//                 <Lock className="h-3 w-3 text-muted-foreground" />
//               </Label>
//               <Input 
//                 value={user?.email || ""} 
//                 disabled 
//                 className="bg-muted/50 cursor-not-allowed text-sm"
//               />
//               <p className="text-[10px] sm:text-xs text-muted-foreground">
//                 Email cannot be changed. Contact admin for assistance.
//               </p>
//             </div>

//             {/* Name */}
//             <div className="space-y-2">
//               <Label className="text-xs sm:text-sm flex items-center gap-2">
//                 <User className="h-3.5 w-3.5" />
//                 Full Name
//               </Label>
//               <Input 
//                 value={employeeData?.name || ""} 
//                 disabled 
//                 className="bg-muted/50 cursor-not-allowed text-sm"
//               />
//             </div>

//             {/* Phone */}
//             <div className="space-y-2">
//               <Label className="text-xs sm:text-sm flex items-center gap-2">
//                 <Phone className="h-3.5 w-3.5" />
//                 Phone
//               </Label>
//               <Input 
//                 value={employeeData?.phone || "Not provided"} 
//                 disabled 
//                 className="bg-muted/50 cursor-not-allowed text-sm"
//               />
//             </div>

//             {/* Department */}
//             <div className="grid grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label className="text-xs sm:text-sm flex items-center gap-2">
//                   <Building2 className="h-3.5 w-3.5" />
//                   Department
//                 </Label>
//                 <Input 
//                   value={employeeData?.department || "Not assigned"} 
//                   disabled 
//                   className="bg-muted/50 cursor-not-allowed text-sm"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label className="text-xs sm:text-sm flex items-center gap-2">
//                   <Briefcase className="h-3.5 w-3.5" />
//                   Designation
//                 </Label>
//                 <Input 
//                   value={employeeData?.designation || "Not assigned"} 
//                   disabled 
//                   className="bg-muted/50 cursor-not-allowed text-sm"
//                 />
//               </div>
//             </div>

//             {/* Joining Date */}
//             <div className="space-y-2">
//               <Label className="text-xs sm:text-sm flex items-center gap-2">
//                 <Calendar className="h-3.5 w-3.5" />
//                 Joining Date
//               </Label>
//               <Input 
//                 value={employeeData?.joiningDate ? new Date(employeeData.joiningDate).toLocaleDateString() : "Not available"} 
//                 disabled 
//                 className="bg-muted/50 cursor-not-allowed text-sm"
//               />
//             </div>

//             {/* Role Badge */}
//             <div className="pt-2 border-t border-border">
//               <div className="flex items-center gap-2">
//                 <Shield className="h-4 w-4 text-primary" />
//                 <span className="text-sm font-medium">Role:</span>
//                 <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
//                   {userRole || "Employee"}
//                 </span>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Change Password Card */}
//         <Card className="shadow-card">
//           <CardHeader>
//             <CardTitle className="text-base sm:text-lg flex items-center gap-2">
//               <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
//               Change Password
//             </CardTitle>
//             <CardDescription className="text-xs sm:text-sm">
//               Update your account password
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handlePasswordChange} className="space-y-4">
//               {/* Current Password */}
//               <div className="space-y-2">
//                 <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Current Password</Label>
//                 <div className="relative">
//                   <Input
//                     id="currentPassword"
//                     type={showCurrentPassword ? "text" : "password"}
//                     placeholder="Enter current password"
//                     value={currentPassword}
//                     onChange={(e) => setCurrentPassword(e.target.value)}
//                     className="pr-10 text-sm"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowCurrentPassword(!showCurrentPassword)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
//                   >
//                     {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 </div>
//               </div>

//               {/* New Password */}
//               <div className="space-y-2">
//                 <Label htmlFor="newPassword" className="text-xs sm:text-sm">New Password</Label>
//                 <div className="relative">
//                   <Input
//                     id="newPassword"
//                     type={showNewPassword ? "text" : "password"}
//                     placeholder="Enter new password (min 6 characters)"
//                     value={newPassword}
//                     onChange={(e) => setNewPassword(e.target.value)}
//                     className="pr-10 text-sm"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowNewPassword(!showNewPassword)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
//                   >
//                     {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 </div>
//               </div>

//               {/* Confirm Password */}
//               <div className="space-y-2">
//                 <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirm New Password</Label>
//                 <div className="relative">
//                   <Input
//                     id="confirmPassword"
//                     type={showConfirmPassword ? "text" : "password"}
//                     placeholder="Confirm new password"
//                     value={confirmPassword}
//                     onChange={(e) => setConfirmPassword(e.target.value)}
//                     className="pr-10 text-sm"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
//                   >
//                     {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 </div>
//               </div>

//               <Button 
//                 type="submit" 
//                 className="w-full gradient-primary text-primary-foreground"
//                 disabled={isChangingPassword}
//               >
//                 {isChangingPassword ? (
//                   <span className="flex items-center gap-2">
//                     <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
//                     Updating...
//                   </span>
//                 ) : (
//                   "Update Password"
//                 )}
//               </Button>
//             </form>
//           </CardContent>
//         </Card>
//       </main>
//     </div>
//   );
// }
