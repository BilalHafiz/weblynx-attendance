import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";

interface PrivateRouteProps {
  children: JSX.Element;
  role: string;
}

const PrivateRoute = ({ children, role: requiredRole }: PrivateRouteProps) => {
  const { user, userRole, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Role missing
  if (!userRole) {
    toast.error("Role not found. Contact administrator.");
    return <Navigate to="/" replace />;
  }

  // Employee case
  if (userRole === "employee") {
    toast.info("Employee dashboard is not set up yet.");
    return <Navigate to="/" replace />;
  }

  // Admin check
  if (requiredRole === "admin" && userRole !== "admin") {
    toast.error("Access denied.");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;