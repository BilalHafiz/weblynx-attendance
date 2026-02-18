import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface PrivateRouteProps {
  children: JSX.Element;
  role: string;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, userRole, loading } = useAuth(); 
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (userRole === "admin") {
    navigate("/index", { replace: true });
  } else if (userRole === "employee") {
    navigate("/employee-dashboard", { replace: true });
  }

  return children;
};

export default PrivateRoute;