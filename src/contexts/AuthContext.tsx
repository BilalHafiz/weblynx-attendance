import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/auth-token";

export type UserRole = "admin" | "employee" | null;

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}

interface JwtPayload {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  exp?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  userRole: UserRole;
  loading: boolean;
  setUserFromToken: (token: string) => void;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  createEmployee: (email: string, password: string, employeeData: any) => Promise<{ success: boolean; error?: string; userId?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseToken(token: string): AuthUser | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (!decoded?.uid || !decoded?.email) return null;
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role ?? null,
      name: decoded.name ?? decoded.email,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = user?.role ?? null;

  const setUserFromToken = (token: string) => {
    setStoredToken(token);
    const parsed = parseToken(token);
    setUser(parsed);
  };

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const parsed = parseToken(token);
      setUser(parsed);
      if (!parsed) clearStoredToken();
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const logout = async (): Promise<void> => {
    clearStoredToken();
    setUser(null);
  };

  const changePassword = async (
    _currentPassword: string,
    _newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    return {
      success: false,
      error: "Change password is not yet available. Please contact your administrator.",
    };
  };

  const createEmployee = async (
    email: string,
    password: string,
    employeeData: any
  ): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = userCredential.user.uid;

      await setDoc(doc(db, "user_roles", newUserId), {
        user_id: newUserId,
        role: "employee",
      });

      await setDoc(doc(db, "employees", newUserId), {
        user_id: newUserId,
        email,
        name: employeeData.name,
        phone: employeeData.phone || "",
        department: employeeData.department || "",
        designation: employeeData.designation || "",
        joiningDate: employeeData.joiningDate || new Date().toISOString(),
        status: "active",
        createdAt: new Date().toISOString(),
      });

      await signOut(auth);
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
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        setUserFromToken,
        logout,
        changePassword,
        createEmployee,
      }}
    >
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
