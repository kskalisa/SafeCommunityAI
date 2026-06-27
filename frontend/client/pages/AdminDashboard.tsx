import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Home, Users, BarChart3, Shield, LogOut, Settings } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = sessionStorage.getItem("userRole");

  useEffect(() => {
    if (userRole !== "admin") {
      navigate("/login");
    }
  }, [userRole, navigate]);

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard/admin",
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: "Users",
      path: "/dashboard/admin/users",
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: "Analytics",
      path: "/dashboard/admin/analytics",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      label: "Audit Logs",
      path: "/dashboard/admin/audit",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      label: "Settings",
      path: "/dashboard/admin/settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <DashboardLayout navItems={navItems} currentPath={location.pathname}>
      <Outlet />
    </DashboardLayout>
  );
}

