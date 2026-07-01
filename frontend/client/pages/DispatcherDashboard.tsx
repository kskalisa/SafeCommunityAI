import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Home, AlertCircle, MapPin, Users, BarChart3, MessageCircle, Hospital } from "lucide-react";
import { incidentsApi } from "@/services/api/incidents";

export default function DispatcherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = sessionStorage.getItem("userRole");
  const queue = useQuery({
    queryKey: ["incidents", "queue"],
    queryFn: incidentsApi.queue,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const queueCount = queue.data?.length ?? 0;

  useEffect(() => {
    if (userRole !== "dispatcher") {
      navigate("/login");
    }
  }, [userRole, navigate]);

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard/dispatcher",
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: "Incident Queue",
      path: "/dashboard/dispatcher/queue",
      icon: <AlertCircle className="w-5 h-5" />,
      badge: queueCount,
    },
    {
      label: "Map View",
      path: "/dashboard/dispatcher/map",
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      label: "Resources",
      path: "/dashboard/dispatcher/resources",
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: "Hospitals",
      path: "/dashboard/dispatcher/hospitals",
      icon: <Hospital className="w-5 h-5" />,
    },
    {
      label: "Reports",
      path: "/dashboard/dispatcher/reports",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      label: "Communications",
      path: "/dashboard/dispatcher/communications",
      icon: <MessageCircle className="w-5 h-5" />,
    },
  ];

  return (
    <DashboardLayout navItems={navItems} currentPath={location.pathname}>
      <Outlet />
    </DashboardLayout>
  );
}
