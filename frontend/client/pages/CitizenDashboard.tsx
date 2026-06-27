import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Home, MapPin, Heart, MapIcon, AlertCircle, FilePlus2 } from "lucide-react";

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = sessionStorage.getItem("userRole");

  useEffect(() => {
    if (userRole !== "citizen") {
      navigate("/login");
    }
  }, [userRole, navigate]);

  const navItems = [
    {
      label: "Home",
      path: "/dashboard/citizen",
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: "Report Incident",
      path: "/dashboard/citizen/report",
      icon: <FilePlus2 className="w-5 h-5" />,
    },
    {
      label: "Incidents",
      path: "/dashboard/citizen/incidents",
      icon: <AlertCircle className="w-5 h-5" />,
    },
    {
      label: "Live Map",
      path: "/dashboard/citizen/map",
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      label: "Safety Tips",
      path: "/dashboard/citizen/safety",
      icon: <Heart className="w-5 h-5" />,
    },
    {
      label: "Emergency Contacts",
      path: "/dashboard/citizen/contacts",
      icon: <MapIcon className="w-5 h-5" />,
    },
  ];

  return (
    <DashboardLayout navItems={navItems} currentPath={location.pathname}>
      <Outlet />
    </DashboardLayout>
  );
}
