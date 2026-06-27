import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Home, MapPin, TrendingUp, Settings } from "lucide-react";

export default function ResponderDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = sessionStorage.getItem("userRole");

  useEffect(() => {
    if (userRole !== "responder") {
      navigate("/login");
    }
  }, [userRole, navigate]);

  const navItems = [
    {
      label: "Home",
      path: "/dashboard/responder",
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: "GPS & Navigation",
      path: "/dashboard/responder/map",
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      label: "Performance",
      path: "/dashboard/responder/performance",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: "Settings",
      path: "/dashboard/responder/settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <DashboardLayout navItems={navItems} currentPath={location.pathname}>
      <Outlet />
    </DashboardLayout>
  );
}
