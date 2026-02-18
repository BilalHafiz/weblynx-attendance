import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type UserRole = "admin" | "employee" | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  createEmployee: (email: string, password: string, employeeData: any) => Promise<{ success: boolean; error?: string; userId?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role from Firestore
  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    try {
      const roleDoc = await getDoc(doc(db, "user_roles", userId));
      if (roleDoc.exists()) {
        return roleDoc.data().role as UserRole;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const role = await fetchUserRole(currentUser.uid);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const role = await fetchUserRole(userCredential.user.uid);
      setUserRole(role);
      
      return { success: true, role };
    } catch (error: any) {
      let message = "Login failed!";
      if (error.code === "auth/user-not-found") message = "No user found with this email.";
      else if (error.code === "auth/wrong-password") message = "Incorrect password.";
      else if (error.code === "auth/invalid-email") message = "Invalid email.";
      else if (error.code === "auth/invalid-credential") message = "Invalid email or password.";
      
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    await signOut(auth);
    setUserRole(null);
  };

  // Change password function (for employees)
  const changePassword = async (
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || !user.email) {
        return { success: false, error: "No user logged in" };
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      return { success: true };
    } catch (error: any) {
      let message = "Failed to change password";
      if (error.code === "auth/wrong-password") message = "Current password is incorrect";
      else if (error.code === "auth/weak-password") message = "New password is too weak";
      else if (error.code === "auth/requires-recent-login") message = "Please login again and retry";
      
      return { success: false, error: message };
    }
  };

  // Create employee (admin only)
  const createEmployee = async (
    email: string, 
    password: string, 
    employeeData: any
  ): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
      // Store current admin user
      const currentAdminUser = auth.currentUser;
      const adminEmail = currentAdminUser?.email;
      
      // Create new user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = userCredential.user.uid;

      // Create user_roles document
      await setDoc(doc(db, "user_roles", newUserId), {
        user_id: newUserId,
        role: "employee"
      });

      // Create employees document
      await setDoc(doc(db, "employees", newUserId), {
        user_id: newUserId,
        email: email,
        name: employeeData.name,
        phone: employeeData.phone || "",
        department: employeeData.department || "",
        designation: employeeData.designation || "",
        joiningDate: employeeData.joiningDate || new Date().toISOString(),
        status: "active",
        createdAt: new Date().toISOString()
      });

      // Sign out the newly created user (they were auto-signed in)
      await signOut(auth);

      // Note: Admin will need to log back in
      // This is a limitation without Firebase Admin SDK

      return { success: true, userId: newUserId };
    } catch (error: any) {
      let message = "Failed to create employee";
      if (error.code === "auth/email-already-in-use") message = "Email already registered";
      else if (error.code === "auth/invalid-email") message = "Invalid email format";
      else if (error.code === "auth/weak-password") message = "Password is too weak";
      
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      loading, 
      login, 
      logout, 
      changePassword,
      createEmployee 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
