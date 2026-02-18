import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import PrivateRoute from "@/components/PrivateRoute/PrivateRoute";

// Pages
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import AddEmployee from "./pages/AddEmployee";
import EmployeeProfile from "./pages/EmployeeProfile";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Holiday from "./pages/Holiday";
// import EmployeeDashboard from "./pages/EmployeeDashboard";
// import EmployeeSettings from "./pages/EmployeeSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/index" element={
              <PrivateRoute role="admin">
                <Index />
              </PrivateRoute>
            } />
            {/* <Route path="/employee-dashboard" element={
              <PrivateRoute role="employee">
                <EmployeeDashboard />
              </PrivateRoute>
            } />
            <Route path="/employee-settings" element={
              <PrivateRoute role="employee">
                <EmployeeSettings />
              </PrivateRoute>
            } /> */}
            <Route path="/employees" element={
              <PrivateRoute role="admin">
                <Employees />
              </PrivateRoute>
            } />
            <Route path="/attendance" element={
              <PrivateRoute role="admin">
                <Attendance />
              </PrivateRoute>
            } />
            <Route path="/reports" element={
              <PrivateRoute role="admin">
                <Reports />
              </PrivateRoute>
            } />
            <Route path="/add-employee" element={
              <PrivateRoute role="admin">
                <AddEmployee />
              </PrivateRoute>
            } />
            <Route path="/employee/:id" element={
              <PrivateRoute role="admin">
                <EmployeeProfile />
              </PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute role="admin">
                <Settings />
              </PrivateRoute>
            } />
            <Route path="/holiday" element={
              <PrivateRoute role="admin">
                <Holiday />
              </PrivateRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;