import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Activity, Bell, Building2, FileBarChart, Home, LifeBuoy, Package, Settings, Shield, Siren, Users } from "lucide-react";

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
      label: "Incidents",
      path: "/dashboard/admin/incidents",
      icon: <Siren className="w-5 h-5" />,
    },
    {
      label: "Responders",
      path: "/dashboard/admin/responders",
      icon: <LifeBuoy className="w-5 h-5" />,
    },
    {
      label: "Resources",
      path: "/dashboard/admin/resources",
      icon: <Package className="w-5 h-5" />,
    },
    {
      label: "Facilities",
      path: "/dashboard/admin/facilities",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      label: "Notifications",
      path: "/dashboard/admin/notifications",
      icon: <Bell className="w-5 h-5" />,
    },
    {
      label: "Reports",
      path: "/dashboard/admin/analytics",
      icon: <FileBarChart className="w-5 h-5" />,
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

