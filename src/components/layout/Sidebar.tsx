import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  Settings,
  LogOut,
  FileBarChart,
  Menu,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { title: "Dashboard", url: "/index", icon: LayoutDashboard },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Attendance", url: "/attendance", icon: ClipboardList },
  { title: "Reports", url: "/reports", icon: FileBarChart },
  { title: "Holiday", url: "/holiday", icon: PartyPopper },
];

const bottomNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const handleLogout = async () => {

    try {
      await logout();

      toast({ title: "Success", description: "You have been logged out.", variant: "default" });

      navigate("/", { replace: true });
    } catch (error) {
      toast({ title: "Error", description: "Logout failed. Please try again.", variant: "destructive" });
    }
  };

  const isActive = (path: string) => {
    if (path === "/index") return location.pathname === "/index";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="flex items-center gap-3 px-6 py-7 border-b border-sidebar-border">
        <div>
          <img
            src="/logo.png"
            alt="WebLynx Logo"
            className="h-10 w-auto object-contain flex-shrink-0"
          />
        </div>
      </div>

      <nav className="flex-1 px-4 py-6">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.url)
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
              {isActive(item.url) && (
                <div className="ml-auto h-2 w-2 rounded-full bg-white" />
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="px-4 pb-6 space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.url)
              ? "bg-sidebar-accent text-white"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
        <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all duration-200">
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 lg:hidden bg-card shadow-md border border-border"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar">
          <SidebarContent onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground hidden lg:flex flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
