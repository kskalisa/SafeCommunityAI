export type Role = "CITIZEN" | "RESPONDER" | "DISPATCHER" | "ADMIN";
export type IncidentType = "MEDICAL" | "FIRE" | "ACCIDENT" | "CRIME" | "NATURAL_DISASTER" | "OTHER";
export type IncidentStatus = "PENDING" | "PRIORITIZED" | "ASSIGNED" | "EN_ROUTE" | "ON_SCENE" | "RESOLVED" | "CANCELLED";
export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ResponderStatus = "AVAILABLE" | "ASSIGNED" | "EN_ROUTE" | "ON_SCENE" | "TRANSPORTING" | "COMPLETED" | "OFFLINE";
export type ResourceStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "OUT_OF_SERVICE";

export interface AuthResponse {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  fullName: string;
  role: Role;
  phone?: string;
  locationPrivacyConsent?: boolean;
  organization?: string;
  certificationLicense?: string;
  vehicleNumber?: string;
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  phone?: string;
  enabled: boolean;
  createdAt: string;
}

export interface ResponderDetailResponse extends UserResponse {
  organization?: string;
  certificationLicense?: string;
  vehicleNumber?: string;
  verificationStatus?: string;
  availabilityStatus?: ResponderStatus;
}

export interface IncidentResponse {
  id: number;
  referenceNumber: string;
  type: IncidentType;
  status: IncidentStatus;
  priority: PriorityLevel;
  priorityScore: number;
  aiConfidenceScore: number;
  aiExplanation?: string;
  resourceSuggestion?: string;
  severity?: string;
  latitude?: number;
  longitude?: number;
  manualLocation?: string;
  description?: string;
  anonymousReport: boolean;
  witnessName?: string;
  witnessPhone?: string;
  emergencyContactsNotified: boolean;
  attachments: AttachmentResponse[];
  reporterName: string;
  reportedAt: string;
  resolvedAt?: string;
}

export interface AttachmentRequest {
  fileName: string;
  contentType?: string;
  url?: string;
}

export interface AttachmentResponse extends AttachmentRequest {
  id: number;
  sizeBytes?: number;
}

export interface AssignmentResponse {
  id: number;
  incidentId: number;
  referenceNumber: string;
  type: IncidentType;
  priority: PriorityLevel;
  incidentStatus: IncidentStatus;
  responderStatus: ResponderStatus;
  location: string;
  description: string;
  etaMinutes: number;
  assignedAt: string;
  latitude?: number;
  longitude?: number;
}

export interface NotificationResponse {
  id: number;
  title: string;
  message: string;
  broadcast: boolean;
  read: boolean;
  createdAt: string;
}

export interface NotificationRequest {
  title: string;
  message: string;
  recipientId?: number;
}

export interface ResourceResponse {
  id: number;
  name: string;
  type: string;
  status: ResourceStatus;
  location?: string;
}

export interface HospitalResponse {
  id: number;
  name: string;
  address?: string;
  contact?: string;
  latitude?: number;
  longitude?: number;
  erBeds?: number;
  icuBeds?: number;
  generalBeds?: number;
  traumaCenter: boolean;
  ambulanceDiversion: boolean;
  avgHandoffMinutes?: number;
  patientsReceivedToday?: number;
  handoffNotes?: string;
}

export interface EmergencyContactRequest {
  name: string;
  type: string;
  phone: string;
  email?: string;
  notifyOnEmergency: boolean;
}

export interface EmergencyContactResponse extends EmergencyContactRequest {
  id: number;
}

export interface DispatchRecommendationResponse {
  responderId: number;
  fullName: string;
  organization?: string;
  vehicleNumber?: string;
  availabilityStatus: ResponderStatus;
  distanceKm: number;
  etaMinutes: number;
  reason: string;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteResponse {
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  distanceKm: number;
  etaMinutes: number;
  engine: string;
  geometry: RoutePoint[];
  instructions: string[];
}

export interface AuditLogResponse {
  id: number;
  action: string;
  actorEmail: string;
  entityType?: string;
  entityId?: number;
  detail?: string;
  createdAt: string;
}

export interface DashboardResponse {
  role: Role;
  metrics: Record<string, unknown>;
}
export interface LocationMarkerResponse {
  id: number;
  userId: number;
  fullName: string;
  role: Role;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  consentProvided: boolean;
  capturedAt: string;
}

export interface TrendRow {
  date: string;
  incidents: number;
}

export interface ResponderPerformanceRow {
  responder: string;
  assignments: number;
  completed: number;
  averageEtaMinutes: number;
}

export interface AnalyticsResponse {
  generatedAt: string;
  userCount: number;
  incidentCount: number;
  activeIncidents: number;
  resolvedIncidents: number;
  pendingIncidentQueue: number;
  activeResponders: number;
  availableResources: number;
  averageResponseMinutes: number;
  aiAverageConfidence: number;
  usersByRole: Record<Role, number>;
  incidentsByType: Record<IncidentType, number>;
  incidentsByStatus: Record<IncidentStatus, number>;
  incidentsByPriority: Record<PriorityLevel, number>;
  resourcesByStatus: Record<ResourceStatus, number>;
  dailyIncidentTrend: TrendRow[];
  responderPerformance: ResponderPerformanceRow[];
  recentIncidents: IncidentResponse[];
}

