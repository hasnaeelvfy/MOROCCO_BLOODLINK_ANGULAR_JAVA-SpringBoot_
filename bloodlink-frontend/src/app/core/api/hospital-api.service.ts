import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  BloodRequestDto,
  ConnectedDonorProfileDto,
  HospitalDashboardDto,
  HospitalProfileDto,
  InstitutionProfileDto,
  MatchDto,
  MessageDto,
  NotificationDto
} from './api.models';

const PREFIX = `${API_BASE_URL}/api/v1/hospital`;

@Injectable({ providedIn: 'root' })
export class HospitalApiService {
  private readonly http = inject(HttpClient);
  readonly profile = signal<HospitalProfileDto | null>(null);
  readonly unread = signal(0);

  loadProfile(): Observable<HospitalProfileDto> {
    return this.http.get<HospitalProfileDto>(`${PREFIX}/profile`).pipe(
      tap((profile) => {
        this.profile.set(profile);
        this.unread.set(profile.unreadNotifications);
      })
    );
  }

  updateProfile(body: {
    name: string;
    type?: string;
    email?: string;
    phone: string;
    registrationNumber?: string;
    website?: string;
    cityId: number;
    address: string;
    contact?: string;
    position?: string;
    description?: string;
    workingHours?: string;
  }): Observable<HospitalProfileDto> {
    return this.http.put<HospitalProfileDto>(`${PREFIX}/profile`, body).pipe(
      tap((profile) => {
        this.profile.set(profile);
        this.unread.set(profile.unreadNotifications);
      })
    );
  }

  dashboard(): Observable<HospitalDashboardDto> {
    return this.http.get<HospitalDashboardDto>(`${PREFIX}/dashboard`);
  }

  uploadLogo(file: File): Observable<HospitalProfileDto> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<HospitalProfileDto>(`${PREFIX}/profile/logo`, body).pipe(
      tap((profile) => {
        this.profile.set(profile);
        this.unread.set(profile.unreadNotifications);
      })
    );
  }

  institution(): Observable<InstitutionProfileDto> {
    return this.http.get<InstitutionProfileDto>(`${PREFIX}/institution`);
  }

  donorProfile(id: number | string): Observable<ConnectedDonorProfileDto> {
    return this.http.get<ConnectedDonorProfileDto>(`${PREFIX}/donors/${id}`);
  }

  requests(): Observable<BloodRequestDto[]> {
    return this.http.get<BloodRequestDto[]>(`${PREFIX}/requests`);
  }

  createRequest(body: {
    bloodType: string;
    units: number;
    urgency: string;
    neededBefore: string;
    notes?: string;
    reference?: string;
    reason?: string;
    contactName?: string;
    contactPhone?: string;
    contactMethod?: string;
  }): Observable<BloodRequestDto> {
    return this.http.post<BloodRequestDto>(`${PREFIX}/requests`, body);
  }

  request(id: number | string): Observable<BloodRequestDto> {
    return this.http.get<BloodRequestDto>(`${PREFIX}/requests/${id}`);
  }

  updateRequest(
    id: number | string,
    body: Partial<{
      bloodType: string;
      units: number;
      urgency: string;
      neededBefore: string;
      notes: string;
      reference: string;
      reason: string;
    }>
  ): Observable<BloodRequestDto> {
    return this.http.put<BloodRequestDto>(`${PREFIX}/requests/${id}`, body);
  }

  cancelRequest(id: number | string): Observable<BloodRequestDto> {
    return this.http.post<BloodRequestDto>(`${PREFIX}/requests/${id}/cancel`, {});
  }

  requestMatches(id: number | string): Observable<MatchDto[]> {
    return this.http.get<MatchDto[]>(`${PREFIX}/requests/${id}/matches`);
  }

  matches(): Observable<MatchDto[]> {
    return this.http.get<MatchDto[]>(`${PREFIX}/matches`);
  }

  contactMatch(id: number | string): Observable<MatchDto> {
    return this.http.post<MatchDto>(`${PREFIX}/matches/${id}/contact`, {});
  }

  scheduleMatch(id: number | string, scheduledAt: string): Observable<MatchDto> {
    return this.http.post<MatchDto>(`${PREFIX}/matches/${id}/schedule`, { scheduledAt });
  }

  completeMatch(id: number | string): Observable<MatchDto> {
    return this.http.post<MatchDto>(`${PREFIX}/matches/${id}/complete`, {});
  }

  cancelDonation(id: number | string, reason?: string, noShow?: boolean): Observable<MatchDto> {
    return this.http.post<MatchDto>(`${PREFIX}/matches/${id}/cancel-donation`, { reason, noShow });
  }

  messages(id: number | string): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${PREFIX}/requests/${id}/messages`);
  }

  sendMessage(id: number | string, text: string): Observable<MessageDto> {
    return this.http.post<MessageDto>(`${PREFIX}/requests/${id}/messages`, { text });
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
