import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  AdminDonorSummaryDto,
  AdminHospitalSummaryDto,
  AdminNotificationDto,
  AdminOverviewDto,
  AdminUserSummaryDto,
  AuditLogDto,
  BloodRequestDto,
  DonationDto,
  MatchDto
} from './api.models';

const PREFIX = `${API_BASE_URL}/api/v1/admin`;

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  overview(): Observable<AdminOverviewDto> {
    return this.http.get<AdminOverviewDto>(`${PREFIX}/overview`);
  }

  hospitals(q = '', verification = ''): Observable<AdminHospitalSummaryDto[]> {
    return this.http.get<AdminHospitalSummaryDto[]>(`${PREFIX}/hospitals`, { params: this.params({ q, verification }) });
  }

  verify(id: number): Observable<AdminHospitalSummaryDto> {
    return this.http.post<AdminHospitalSummaryDto>(`${PREFIX}/hospitals/${id}/verify`, {});
  }

  reject(id: number, reason?: string): Observable<AdminHospitalSummaryDto> {
    return this.http.post<AdminHospitalSummaryDto>(`${PREFIX}/hospitals/${id}/reject`, { reason });
  }

  suspendHospital(id: number, reason?: string): Observable<AdminHospitalSummaryDto> {
    return this.http.post<AdminHospitalSummaryDto>(`${PREFIX}/hospitals/${id}/suspend`, { reason });
  }

  reactivateHospital(id: number): Observable<AdminHospitalSummaryDto> {
    return this.http.post<AdminHospitalSummaryDto>(`${PREFIX}/hospitals/${id}/reactivate`, {});
  }

  donors(q = '', bloodType = '', eligibility = '', status = ''): Observable<AdminDonorSummaryDto[]> {
    return this.http.get<AdminDonorSummaryDto[]>(`${PREFIX}/donors`, {
      params: this.params({ q, bloodType, eligibility, status })
    });
  }

  donorHistory(id: number): Observable<DonationDto[]> {
    return this.http.get<DonationDto[]>(`${PREFIX}/donors/${id}/history`);
  }

  suspendDonor(id: number): Observable<AdminDonorSummaryDto> {
    return this.http.post<AdminDonorSummaryDto>(`${PREFIX}/donors/${id}/suspend`, {});
  }

  reactivateDonor(id: number): Observable<AdminDonorSummaryDto> {
    return this.http.post<AdminDonorSummaryDto>(`${PREFIX}/donors/${id}/reactivate`, {});
  }

  requests(q = '', status = '', bloodType = '', urgency = ''): Observable<BloodRequestDto[]> {
    return this.http.get<BloodRequestDto[]>(`${PREFIX}/requests`, {
      params: this.params({ q, status, bloodType, urgency })
    });
  }

  cancelRequest(id: number, reason?: string): Observable<BloodRequestDto> {
    return this.http.post<BloodRequestDto>(`${PREFIX}/requests/${id}/cancel`, { reason });
  }

  requestMatches(id: number): Observable<MatchDto[]> {
    return this.http.get<MatchDto[]>(`${PREFIX}/requests/${id}/matches`);
  }

  matches(q = '', status = ''): Observable<MatchDto[]> {
    return this.http.get<MatchDto[]>(`${PREFIX}/matches`, { params: this.params({ q, status }) });
  }

  donations(q = '', donorId?: number, hospitalId?: number): Observable<DonationDto[]> {
    return this.http.get<DonationDto[]>(`${PREFIX}/donations`, {
      params: this.params({
        q,
        donorId: donorId == null ? '' : String(donorId),
        hospitalId: hospitalId == null ? '' : String(hospitalId)
      })
    });
  }

  users(q = '', role = '', status = ''): Observable<AdminUserSummaryDto[]> {
    return this.http.get<AdminUserSummaryDto[]>(`${PREFIX}/users`, { params: this.params({ q, role, status }) });
  }

  deactivateUser(id: number): Observable<AdminUserSummaryDto> {
    return this.http.post<AdminUserSummaryDto>(`${PREFIX}/users/${id}/deactivate`, {});
  }

  suspendUser(id: number): Observable<AdminUserSummaryDto> {
    return this.http.post<AdminUserSummaryDto>(`${PREFIX}/users/${id}/suspend`, {});
  }

  reactivateUser(id: number): Observable<AdminUserSummaryDto> {
    return this.http.post<AdminUserSummaryDto>(`${PREFIX}/users/${id}/reactivate`, {});
  }

  notifications(): Observable<AdminNotificationDto[]> {
    return this.http.get<AdminNotificationDto[]>(`${PREFIX}/notifications`);
  }

  audit(): Observable<AuditLogDto[]> {
    return this.http.get<AuditLogDto[]>(`${PREFIX}/audit`);
  }

  private params(values: Record<string, string>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value) params = params.set(key, value);
    }
    return params;
  }
}
