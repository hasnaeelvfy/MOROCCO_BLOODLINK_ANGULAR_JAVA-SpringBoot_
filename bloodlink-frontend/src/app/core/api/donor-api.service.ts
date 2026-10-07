import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { EligibilityResult } from '../../mock/models';
import { API_BASE_URL } from '../api.config';
import {
  DonationDto,
  DonorDashboardDto,
  DonorProfileDto,
  InstitutionProfileDto,
  MatchDto,
  MessageDto,
  NotificationDto
} from './api.models';

const PREFIX = `${API_BASE_URL}/api/v1/donor`;

@Injectable({ providedIn: 'root' })
export class DonorApiService {
  private readonly http = inject(HttpClient);
  readonly profile = signal<DonorProfileDto | null>(null);
  readonly unread = signal(0);

  loadProfile(): Observable<DonorProfileDto> {
    return this.http.get<DonorProfileDto>(`${PREFIX}/profile`).pipe(
      tap((profile) => {
        this.profile.set(profile);
        this.unread.set(profile.unreadNotifications);
      })
    );
  }

  updateProfile(body: {
    firstName: string;
    lastName: string;
    phone: string;
    cin: string;
    cityId: number;
    bloodType?: string;
    dateOfBirth?: string;
    weightKg?: number;
    heightCm?: number;
    lastDonation?: string;
    preferredContact?: string;
    locationConsent?: boolean;
    latitude?: number;
    longitude?: number;
  }): Observable<DonorProfileDto> {
    return this.http.put<DonorProfileDto>(`${PREFIX}/profile`, body).pipe(
      tap((profile) => {
        this.profile.set(profile);
        this.unread.set(profile.unreadNotifications);
      })
    );
  }

  setAvailable(available: boolean): Observable<DonorProfileDto> {
    return this.http.post<DonorProfileDto>(`${PREFIX}/availability`, { available }).pipe(
      tap((profile) => this.profile.set(profile))
    );
  }

  evaluate(body: {
    age: number;
    weight: number;
    lastDonation?: string;
    generalHealth: string;
    currentIllness: boolean;
    medication: boolean;
    recentSurgery: boolean;
    recentTravel: boolean;
    pregnancy: boolean;
  }): Observable<{ result: EligibilityResult; nextEligible: string | null; age: number | null; reasons: string[] }> {
    return this.http.post<{ result: EligibilityResult; nextEligible: string | null; age: number | null; reasons: string[] }>(`${PREFIX}/eligibility`, body).pipe(
      tap(() => this.loadProfile().subscribe())
    );
  }

  dashboard(): Observable<DonorDashboardDto> {
    return this.http.get<DonorDashboardDto>(`${PREFIX}/dashboard`).pipe(
      tap((dashboard) => {
        this.profile.set(dashboard.profile);
        this.unread.set(dashboard.profile.unreadNotifications);
      })
    );
  }

  uploadAvatar(file: File): Observable<DonorProfileDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<DonorProfileDto>(`${PREFIX}/profile/avatar`, body).pipe(
      tap((profile) => {
        this.profile.set(profile);
        this.unread.set(profile.unreadNotifications);
      })
    );
  }

  hospitalProfile(id: number | string): Observable<InstitutionProfileDto> {
    return this.http.get<InstitutionProfileDto>(`${PREFIX}/hospitals/${id}`);
  }

  invitations(): Observable<MatchDto[]> {
    return this.http.get<MatchDto[]>(`${PREFIX}/invitations`);
  }

  accept(id: number): Observable<MatchDto> {
    return this.http.post<MatchDto>(`${PREFIX}/invitations/${id}/accept`, {});
  }

  decline(id: number, reason?: string): Observable<MatchDto> {
    return this.http.post<MatchDto>(`${PREFIX}/invitations/${id}/decline`, { reason });
  }

  history(): Observable<DonationDto[]> {
    return this.http.get<DonationDto[]>(`${PREFIX}/history`);
  }

  messages(requestId: number | string): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${PREFIX}/requests/${requestId}/messages`);
  }

  sendMessage(requestId: number | string, text: string): Observable<MessageDto> {
    return this.http.post<MessageDto>(`${PREFIX}/requests/${requestId}/messages`, { text });
  }

  notifications(): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${PREFIX}/notifications`).pipe(
      tap((items) => this.unread.set(items.filter((item) => !item.read).length))
    );
  }

  markRead(id: number): Observable<void> {
    return this.http.post<void>(`${PREFIX}/notifications/${id}/read`, {}).pipe(
      tap(() => this.unread.update((value) => Math.max(0, value - 1)))
    );
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${PREFIX}/notifications/read-all`, {}).pipe(tap(() => this.unread.set(0)));
  }
}
