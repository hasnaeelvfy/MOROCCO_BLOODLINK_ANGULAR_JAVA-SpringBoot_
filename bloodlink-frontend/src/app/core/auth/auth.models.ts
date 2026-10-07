export type BackendRole = 'DONOR' | 'HOSPITAL' | 'ADMIN';

export interface HospitalRegisterRequest {
  email: string;
  password: string;
  hospitalName: string;
  registrationNumber: string;
  phone: string;
  address: string;
  cityId: number;
}

export interface DonorRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  cin: string;
  cityId: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: number;
  role: BackendRole;
  hospitalId: number | null;
  message: string;
}

export interface CurrentUserResponse {
  userId: number;
  email: string;
  role: BackendRole;
  hospitalId: number | null;
  locale?: string | null;
}
