import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from "./context/AuthContext";
import CitizenDashboard from "./pages/CitizenDashboard";
import CitizenHome from "./pages/citizen/Home";
import CitizenReportIncident from "./pages/citizen/ReportIncident";
import CitizenIncidents from "./pages/citizen/Incidents";
import CitizenLiveMap from "./pages/citizen/LiveMap";
import CitizenSafetyTips from "./pages/citizen/SafetyTips";
import CitizenEmergencyContacts from "./pages/citizen/EmergencyContacts";
import ResponderDashboard from "./pages/ResponderDashboard";
import ResponderHome from "./pages/responder/Home";
import ResponderMap from "./pages/responder/Map";
import ResponderPerformance from "./pages/responder/Performance";
import ResponderSettings from "./pages/responder/Settings";
import DispatcherDashboard from "./pages/DispatcherDashboard";
import DispatcherDashboardPage from "./pages/dispatcher/Dashboard";
import DispatcherIncidentQueue from "./pages/dispatcher/IncidentQueue";
import DispatcherLiveMap from "./pages/dispatcher/LiveMap";
import DispatcherResources from "./pages/dispatcher/Resources";
import DispatcherReports from "./pages/dispatcher/Reports";
import DispatcherCommunications from "./pages/dispatcher/Communications";
import DispatcherHospitals from "./pages/dispatcher/Hospitals";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDashboardPage from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminSettings from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Citizen Dashboard Routes */}
          <Route path="/dashboard/citizen" element={<CitizenDashboard />}>
            <Route index element={<CitizenHome />} />
            <Route path="report" element={<CitizenReportIncident />} />
            <Route path="incidents" element={<CitizenIncidents />} />
            <Route path="map" element={<CitizenLiveMap />} />
            <Route path="safety" element={<CitizenSafetyTips />} />
            <Route path="contacts" element={<CitizenEmergencyContacts />} />
          </Route>

          {/* Responder Dashboard Routes */}
          <Route path="/dashboard/responder" element={<ResponderDashboard />}>
            <Route index element={<ResponderHome />} />
            <Route path="map" element={<ResponderMap />} />
            <Route path="performance" element={<ResponderPerformance />} />
            <Route path="settings" element={<ResponderSettings />} />
          </Route>

          {/* Dispatcher Dashboard Routes */}
          <Route path="/dashboard/dispatcher" element={<DispatcherDashboard />}>
            <Route index element={<DispatcherDashboardPage />} />
            <Route path="queue" element={<DispatcherIncidentQueue />} />
            <Route path="map" element={<DispatcherLiveMap />} />
            <Route path="resources" element={<DispatcherResources />} />
            <Route path="hospitals" element={<DispatcherHospitals />} />
            <Route path="reports" element={<DispatcherReports />} />
            <Route path="communications" element={<DispatcherCommunications />} />
          </Route>

          {/* Admin Dashboard Routes */}
          <Route path="/dashboard/admin" element={<AdminDashboard />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="audit" element={<AdminAuditLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

