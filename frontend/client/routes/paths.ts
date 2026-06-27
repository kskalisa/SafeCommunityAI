export const roleDashboardPath: Record<string, string> = {
  citizen: "/dashboard/citizen",
  responder: "/dashboard/responder",
  dispatcher: "/dashboard/dispatcher",
  admin: "/dashboard/admin",
};

export function dashboardPathForRole(role: string) {
  return roleDashboardPath[role.toLowerCase()] ?? "/dashboard/citizen";
}
