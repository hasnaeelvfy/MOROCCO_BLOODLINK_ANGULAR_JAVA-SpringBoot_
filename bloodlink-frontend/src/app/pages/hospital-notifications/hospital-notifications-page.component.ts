import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { NotificationKind } from '../../mock/models';

@Component({
  selector: 'app-hospital-notifications-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'notifications.kicker' | t }}</p>
      <h1>{{ 'notifications' | t }}</h1>
      <p class="hp-lead">{{ 'notifications.leadHospital' | t }}</p>
      <div class="hp-toolbar">
        <button class="hp-btn hp-btn--ghost" type="button" (click)="kind.set('all')">{{ 'common.filter.all' | t }}</button>
        <button class="hp-btn hp-btn--ghost" type="button" (click)="kind.set('unread')">{{ 'notification.filter.unread' | t }}</button>
        <button class="hp-btn hp-btn--ghost" type="button" (click)="kind.set('accepted')">{{ 'notification.filter.responses' | t }}</button>
        <button class="hp-btn hp-btn--ghost" type="button" (click)="kind.set('status')">{{ 'notification.filter.status' | t }}</button>
        <button class="hp-btn" type="button" (click)="markAll()">{{ 'notification.markAll' | t }}</button>
      </div>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingNotifications' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          @for (item of filtered(); track item.id) {
            <div class="hp-note-card" [class.unread-dot]="!item.read">
              <strong>{{ i18n.notificationTitle(item.kind, item.title) }}</strong>
              <p class="hp-note">{{ i18n.notificationBody(item.kind, item.body) }}</p>
              <div class="hp-actions">
                @if (!item.read) {
                  <button class="hp-btn hp-btn--ghost" type="button" (click)="markRead(item.id)">{{ 'notification.markRead' | t }}</button>
                }
                @if (item.requestId) {
                  <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/requests', item.requestId]">{{ 'notifications.openRequest' | t }}</a>
                }
              </div>
            </div>
          } @empty {
            <p class="hp-empty">{{ 'notifications.emptyFilter' | t }}</p>
          }
        </article>
      }
    </section>
  `
})
export class HospitalNotificationsPageComponent {
  private readonly api = inject(HospitalApiService);
  readonly i18n = inject(I18nService);
  readonly items = signal<NotificationDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly kind = signal<NotificationKind | 'all' | 'unread'>('all');
  readonly filtered = computed(() => {
    const list = this.items();
    const kind = this.kind();
    if (kind === 'all') return list;
    if (kind === 'unread') return list.filter((item) => !item.read);
    return list.filter((item) => item.kind === kind);
  });

  constructor() {
    this.reload();
  }

  markRead(id: number): void {
    this.api.markRead(id).subscribe({
      next: () => this.items.update((list) => list.map((item) => (item.id === id ? { ...item, read: true } : item))),
      error: (error) => this.error.set(httpErrorMessage(error))
    });
  }

  markAll(): void {
    this.api.markAllRead().subscribe({
      next: () => this.items.update((list) => list.map((item) => ({ ...item, read: true }))),
      error: (error) => this.error.set(httpErrorMessage(error))
    });
  }

  private reload(): void {
    this.api.notifications().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
