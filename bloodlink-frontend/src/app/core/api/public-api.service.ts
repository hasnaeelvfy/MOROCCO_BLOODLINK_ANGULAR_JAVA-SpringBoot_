import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Urgency } from '../../mock/models';
import { API_BASE_URL } from '../api.config';

export interface PublicBloodRequest {
  id: number;
  publicCode: string;
  bloodType: string;
  units: number;
  city: string;
  urgency: Urgency;
  status: string;
  displayStatus: string;
}

@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private readonly http = inject(HttpClient);
  readonly requests = signal<PublicBloodRequest[]>([]);
  readonly featured = computed(() => this.requests()[0] ?? null);
  readonly hasActive = computed(() => this.requests().length > 0);

  load(): Observable<PublicBloodRequest[]> {
    return this.http.get<PublicBloodRequest[]>(`${API_BASE_URL}/api/v1/public/active-requests`).pipe(
      tap((items) => this.requests.set(items))
    );
  }
}
