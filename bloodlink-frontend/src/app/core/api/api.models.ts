import { EligibilityResult, MatchStatus, NotificationKind, Urgency } from '../../mock/models';
import { API_BASE_URL } from '../api.config';
import { I18nService } from '../../i18n/i18n.service';

export interface MatchCounts {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  closed: number;
  completed?: number;
}

export interface HospitalStatsDto {
  totalRequests: number;
  activeRequests: number;
  criticalRequests: number;
  pendingRequests: number;
  fulfilledRequests: number;
  donorsResponded: number;
  cancelledRequests: number;
  completedDonations: number;
}

export interface BloodRequestDto {
  id: number;
  publicCode: string;
  hospitalId: number;
  hospital: string;
  cityId: number;
  city: string;
  region: string;
  bloodType: string;
  units: number;
  unitsFulfilled: number;
  unitsRemaining: number;
  urgency: Urgency;
  neededBefore: string;
  contactName: string | null;
  contactPhone: string | null;
  contactMethod: string | null;
  notes: string | null;
  reference: string | null;
  reason: string | null;
  status: string;
  displayStatus: string;
  editable: boolean;
  expansion: 'city' | 'region' | 'national';
  createdAt: string;
  updatedAt: string;
  matchCounts: MatchCounts;
}

export interface MatchDto {
  id: number;
  requestId: number;
  hospitalId: number | null;
  donorId: number | null;
  publicRequestCode: string;
  donorPublicCode: string;
  bloodType: string;
  cityId: number;
  city: string;
  available: boolean;
  eligibility: EligibilityResult | null;
  distanceKm: number | null;
  compatibility: string;
  layer: 'city' | 'region' | 'national';
  status: MatchStatus;
  createdAt: string;
  respondedAt: string | null;
  acceptedAt: string | null;
  contactedAt?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  declineReason: string | null;
  hospital: string | null;
  units: number | null;
  urgency: Urgency | null;
  neededBefore: string | null;
  donorName: string | null;
  donorPhone: string | null;
  donorCin: string | null;
  matchScore: number | null;
  matchScoreFormula: string | null;
  hospitalLogoUrl: string | null;
}

export interface NotificationDto {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  requestId: number | null;
  matchId: number | null;
}

export interface HospitalProfileDto {
  id: number;
  name: string;
  type: string | null;
  cityId: number;
  city: string;
  region: string;
  address: string;
  website: string | null;
  registrationNumber: string | null;
  contact: string | null;
  position: string | null;
  email: string | null;
  phone: string;
  description: string | null;
  workingHours: string | null;
  verification: string;
  registeredAt: string | null;
  logoUrl: string | null;
  stats: HospitalStatsDto | null;
  unreadNotifications: number;
}

export interface InstitutionProfileDto {
  id: number;
  name: string;
  type: string | null;
  city: string;
  region: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  workingHours: string | null;
  registrationNumber: string | null;
  verification: string;
  registeredAt: string | null;
  logoUrl: string | null;
  stats: HospitalStatsDto;
  requestedBloodGroups: string[];
  activeRequests: BloodRequestDto[];
}

export interface ConnectedDonorProfileDto {
  id: number;
  publicCode: string;
  fullName: string;
  bloodType: string | null;
  city: string;
  region: string;
  eligibility: EligibilityResult | null;
  lastDonation: string | null;
  nextEligible: string | null;
  phone: string | null;
  cin: string | null;
  avatarUrl: string | null;
  completedDonations: number;
  acceptedRequests: number;
  reliabilityPercent: number | null;
  reliabilityFormula: string | null;
  currentMatchStatus: MatchStatus | null;
  currentRequestId: number | null;
  donationsWithThisHospital: DonationDto[];
}

export interface HospitalDashboardDto {
  hospitalName: string;
  city: string;
  region: string;
  verification: string;
  stats: HospitalStatsDto;
  recentRequests: BloodRequestDto[];
  recentNotifications: NotificationDto[];
}

export interface DonorProfileDto {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  cin: string;
  cityId: number;
  city: string;
  region: string;
  bloodType: string | null;
  available: boolean;
  lastDonation: string | null;
  nextEligible: string | null;
  eligibility: EligibilityResult | null;
  dateOfBirth: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  locationConsent: boolean;
  locationRecorded: boolean;
  approxLatitude: number | null;
  approxLongitude: number | null;
  preferredContact: 'app' | 'phone' | 'email';
  completion: number;
  unreadNotifications: number;
  avatarUrl: string | null;
  registeredAt: string | null;
  completedDonations: number;
  acceptedRequests: number;
  declinedRequests: number;
  reliabilityPercent: number | null;
  reliabilityFormula: string | null;
}

export interface DonorDashboardDto {
  profile: DonorProfileDto;
  stats: {
    pendingInvitations: number;
    accepted: number;
    donations: number;
    availableRequests: number;
    urgentRequests: number;
  };
  pendingInvitations: MatchDto[];
  recentNotifications: NotificationDto[];
}

export interface DonationDto {
  id: number;
  requestId: number | null;
  publicRequestCode: string | null;
  date: string;
  bloodType: string;
  hospital: string;
  city: string;
  units: number;
  status: 'completed' | 'recorded' | 'scheduled' | 'cancelled' | 'no_show';
  acceptedAt?: string | null;
  contactedAt?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  cancellationReason?: string | null;
}

export interface MessageDto {
  id: number;
  requestId: number;
  from: 'donor' | 'hospital';
  authorId: number;
  text: string;
  at: string;
}

export interface AdminOverviewDto {
  hospitals: number;
  donors: number;
  pendingVerifications: number;
  activeRequests: number;
  fulfilledRequests: number;
  activeDonors?: number;
  eligibleDonors?: number;
  pendingHospitals?: number;
  verifiedHospitals?: number;
  rejectedHospitals?: number;
  suspendedHospitals?: number;
  cancelledRequests?: number;
  expiredRequests?: number;
  pendingMatches?: number;
  acceptedMatches?: number;
  completedDonations?: number;
}

export interface AdminHospitalSummaryDto {
  id: number;
  name: string;
  type: string | null;
  city: string;
  phone: string;
  email: string | null;
  registrationNumber: string | null;
  verification: string;
  verificationReason?: string | null;
  registeredAt: string | null;
  logoUrl: string | null;
}

export interface AdminDonorSummaryDto {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  cin: string;
  bloodType: string | null;
  city: string;
  eligibility: EligibilityResult | null;
  nextEligible: string | null;
  completedDonations: number;
  status: string;
  available: boolean;
}

export interface AdminUserSummaryDto {
  id: number;
  email: string;
  role: string;
  status: string;
  hospitalId: number | null;
  hospitalName: string | null;
  donorId: number | null;
  displayName: string;
  locale: string | null;
  createdAt: string | null;
}

export interface AdminNotificationDto {
  id: number;
  userId: number;
  userEmail: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  requestId: number | null;
  matchId: number | null;
  createdAt: string;
}

export interface AuditLogDto {
  id: number;
  actorUserId: number | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: number | null;
  details: string | null;
  createdAt: string;
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}

export function verificationLabel(status: string | null | undefined): string {
  const i18n = I18nService.instance;
  const key =
    status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : status === 'suspended' ? 'suspended' : 'pending';
  return i18n?.enumLabel('verification', key) ?? key;
}
