export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST';
export type AdminStatus = 'ACTIVE' | 'INACTIVE';
export type EntrepreneurStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type PlanType = 'FREE' | 'PRO' | 'BUSINESS';
export type BusinessStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';
export type BusinessStage = 'IDEA' | 'EARLY' | 'GROWTH' | 'ESTABLISHED';
export type UsageEventType =
  | 'LOGIN'
  | 'REPORT_VIEW'
  | 'RECOMMENDATION_VIEW'
  | 'METRIC_UPDATE'
  | 'ALERT_VIEW'
  | 'FEATURE_USE';
export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RecommendationStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'DISMISSED';
export type RecommendationSource = 'SYSTEM' | 'AI' | 'ADMIN';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntrepreneurCounts {
  businesses: number;
  usageEvents: number;
}

export interface Entrepreneur {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  plan: PlanType;
  status: EntrepreneurStatus;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
  _count?: EntrepreneurCounts;
  businesses?: Business[];
}

export interface BusinessEntrepreneurRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  plan?: PlanType;
  status?: EntrepreneurStatus;
}

export interface BusinessCounts {
  alerts: number;
  recommendations: number;
  metrics: number;
}

export interface Business {
  id: string;
  entrepreneurId: string;
  name: string;
  category: string;
  description: string | null;
  stage: BusinessStage;
  status: BusinessStatus;
  employeesCount: number;
  foundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entrepreneur?: BusinessEntrepreneurRef;
  _count?: BusinessCounts;
  metrics?: BusinessMetric[];
  recommendations?: Recommendation[];
  alerts?: Alert[];
}

export interface BusinessMetric {
  id: string;
  businessId: string;
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  customersCount: number;
  salesCount: number;
  createdAt: string;
}

export interface UsageEvent {
  id: string;
  entrepreneurId: string;
  type: UsageEventType;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  entrepreneur?: { id: string; firstName: string; lastName: string; email: string };
}

export interface BusinessRef {
  id: string;
  name: string;
  category: string;
  entrepreneur: { id: string; firstName: string; lastName: string; email: string };
}

export interface AdminRef {
  id: string;
  name: string;
  email: string;
}

export interface Recommendation {
  id: string;
  businessId: string;
  title: string;
  description: string;
  category: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  source: RecommendationSource;
  generatedAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  business?: BusinessRef;
  reviewedBy?: AdminRef | null;
}

export interface Alert {
  id: string;
  businessId: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  triggeredAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolutionNote: string | null;
  business?: BusinessRef;
  resolvedBy?: AdminRef | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: { path: string; message: string }[];
}

export interface MetricsOverview {
  entrepreneurs: { total: number; active: number; suspended: number; newLast30Days: number };
  businesses: { total: number; active: number };
  alerts: { open: number; critical: number };
  recommendations: { pending: number };
  usage: { eventsLast30Days: number };
  plans: Partial<Record<PlanType, number>>;
  finance: { totalRevenue: number; totalExpenses: number; totalProfit: number };
}

export interface GrowthPoint {
  month: string;
  count: number;
}

export interface UsageTrend {
  byMonth: { month: string; count: number }[];
  byType: { type: UsageEventType; count: number }[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface FinancePoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface SystemSignals {
  recommendations: { byStatus: Record<string, number>; byPriority: Record<string, number> };
  alerts: { byStatus: Record<string, number>; bySeverity: Record<string, number> };
}

export interface TopActiveEntrepreneur {
  entrepreneur: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    plan: PlanType;
    status: EntrepreneurStatus;
  } | null;
  events: number;
}

export interface AiAnalysisResult {
  summary: string;
  recommendations: Recommendation[];
  alerts: Alert[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

export interface UsageSummary {
  rangeDays: number;
  totalEvents: number;
  activeEntrepreneurs: number;
  byType: { type: UsageEventType; count: number }[];
}
