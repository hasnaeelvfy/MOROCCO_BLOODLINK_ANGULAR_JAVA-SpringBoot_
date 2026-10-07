export type UserRole = 'donor' | 'hospital' | 'admin';
export type AccountStatus = 'active' | 'deactivated';
export type LocaleCode = 'ar-MA' | 'fr' | 'en';
export type BloodType = 'A+' | 'A−' | 'B+' | 'B−' | 'AB+' | 'AB−' | 'O+' | 'O−';
export type Urgency = 'CRITICAL' | 'URGENT' | 'STANDARD';
export type RequestStatus =
  | 'OPEN'
  | 'SEARCHING'
  | 'RESPONDING'
  | 'PARTIAL'
  | 'PAUSED'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'EXPIRED';
export type MatchStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CONTACTED'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';
export type EligibilityResult = 'eligible' | 'review' | 'ineligible';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type NotificationKind =
  | 'invitation'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'reminder'
  | 'eligibility'
  | 'status'
  | 'verification';

export const BLOOD_TYPES: BloodType[] = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

export function canonicalBloodType(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/[\u2212\u2013\u2014\u00AD]/g, '-')
    .toUpperCase();
}

export function displayBloodType(value: string | null | undefined): BloodType {
  const canonical = canonicalBloodType(value);
  return (canonical.replace('-', '\u2212') || 'O+') as BloodType;
}
export {
  CITIES,
  CITIES_BY_REGION,
  CITY_REGION,
  REGIONS,
  citiesForRegion,
  cityIdOf,
  cityNameOf,
  regionOfCity
} from '../data/morocco-geo';
export type { Region } from '../data/morocco-geo';

export const INSTITUTION_TYPES = [
  'Public hospital',
  'Private hospital',
  'Clinic',
  'Blood center',
  'Other authorized healthcare facility'
] as const;

export const BLOOD_GROUPS = ['A', 'B', 'AB', 'O'] as const;
export const RH_FACTORS = ['+', '−'] as const;

export interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  city: string;
  role: UserRole;
  language: LocaleCode;
  status: AccountStatus;
  hospitalId?: string;
  consentAt?: string;
}

export interface DonorProfile {
  userId: string;
  donorId: string;
  cin: string;
  bloodType: BloodType;
  available: boolean;
  lastDonation: string | null;
  nextEligible: string | null;
  eligibility: EligibilityResult | null;
  dateOfBirth: string | null;
  weightKg: number | null;
  locationConsent: boolean;
  preferredContact: 'phone' | 'email' | 'app';
}

export interface DonationRecord {
  id: string;
  userId: string;
  requestId: string | null;
  date: string;
  bloodType: BloodType;
  hospital: string;
  city: string;
  units: number;
  status: 'completed' | 'recorded';
}

export interface HospitalProfile {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  address: string;
  website: string | null;
  registrationNumber: string | null;
  contact: string;
  position: string;
  email: string;
  phone: string;
  verification: VerificationStatus;
  documentName: string | null;
  staff: number;
}

export interface BloodRequest {
  id: string;
  hospitalId: string;
  hospital: string;
  city: string;
  bloodType: BloodType;
  units: number;
  urgency: Urgency;
  neededBefore: string;
  contactName: string;
  contactPhone: string;
  contactMethod: 'phone' | 'app';
  notes: string;
  reference: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  expansion: 'city' | 'region' | 'national';
}

export interface MatchRecord {
  id: string;
  requestId: string;
  donorUserId: string;
  donorId: string;
  bloodType: BloodType;
  city: string;
  available: boolean;
  eligibility: EligibilityResult | null;
  distanceKm: number | null;
  compatibility: string;
  layer: 'city' | 'region' | 'national';
  status: MatchStatus;
  createdAt: string;
  respondedAt: string | null;
  declineReason?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  requestId?: string;
  matchId?: string;
}

export interface ChatMessage {
  id: string;
  requestId: string;
  from: 'donor' | 'hospital';
  authorId: string;
  text: string;
  at: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export interface Session {
  userId: string;
  role: UserRole;
}

export interface EligibilityAnswers {
  age: number;
  weight: number;
  lastDonation: string;
  generalHealth: 'good' | 'fair' | 'poor';
  currentIllness: boolean;
  medication: boolean;
  recentSurgery: boolean;
  recentTravel: boolean;
  pregnancy: boolean;
}

export interface AppState {
  version: 5;
  users: UserAccount[];
  donors: DonorProfile[];
  donations: DonationRecord[];
  hospitals: HospitalProfile[];
  requests: BloodRequest[];
  matches: MatchRecord[];
  notifications: AppNotification[];
  messages: ChatMessage[];
  audit: AuditEvent[];
  requestSeq: number;
  seeded: boolean;
}
