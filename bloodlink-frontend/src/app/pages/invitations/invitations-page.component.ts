import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatchDto } from '../../core/api/api.models';
import { DonorApiService } from '../../core/api/donor-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { DialogService } from '../../ui/dialog.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-invitations-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'donor.invitations.kicker' | t }}</p>
      <h1>{{ 'donor.dashboard.requestsNearYou' | t }}</h1>
      <p class="hp-lead">{{ 'donor.invitations.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingInvitations' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        @for (item of invitations(); track item.id) {
          <article class="hp-panel" style="margin-bottom:16px">
            <div class="hp-toolbar">
              <span class="hp-pill" [class.hp-pill--ok]="item.status === 'ACCEPTED'" [class.hp-pill--warn]="item.urgency === 'CRITICAL'">
                {{ item.status === 'PENDING' ? urgencyOf(item.urgency) : i18n.enumLabel('matchStatus', item.status) }}
              </span>
            </div>
            <div class="hp-metric"><span>{{ 'donor.invitations.request' | t }}</span><b>{{ item.publicRequestCode }}</b></div>
            <div class="hp-metric"><span>{{ 'auth.role.hospital' | t }}</span><b>{{ item.hospital }}</b></div>
            @if (item.hospitalId) {
              <div class="hp-actions" style="margin-top:8px">
                <a class="hp-btn hp-btn--ghost" [routerLink]="['/donor/hospitals', item.hospitalId]">{{ 'donor.invitations.viewHospital' | t }}</a>
              </div>
            }
            <div class="hp-metric"><span>{{ 'bloodType' | t }}</span><b>{{ item.bloodType }}</b></div>
            <div class="hp-metric"><span>{{ 'units.label' | t }}</span><b>{{ item.units }}</b></div>
            <div class="hp-metric"><span>{{ 'donor.invitations.neededBefore' | t }}</span><b>{{ i18n.formatDateTime(item.neededBefore) }}</b></div>
            <div class="hp-metric"><span>{{ 'donor.invitations.matchScore' | t }}</span><b [title]="item.matchScoreFormula || ''">{{ item.matchScore == null ? ('common.emDash' | t) : item.matchScore }}</b></div>
            <div class="hp-metric"><span>{{ 'table.distance' | t }}</span><b>{{ i18n.formatDistance(item.distanceKm) }}</b></div>
            @if (item.status === 'PENDING') {
              <div class="hp-field" style="margin-top:16px">
                <label>{{ 'donor.invitations.declineReason' | t }}</label>
                <input [(ngModel)]="reasons[item.id]" [name]="'r'+item.id" />
              </div>
              <div class="hp-actions" style="margin-top:16px">
                <button class="hp-btn" type="button" (click)="accept(item.id)">{{ 'accept' | t }}</button>
                <button class="hp-btn hp-btn--ghost" type="button" (click)="decline(item.id)">{{ 'decline' | t }}</button>
              </div>
            } @else if (item.status === 'ACCEPTED') {
              <div class="hp-actions" style="margin-top:16px">
                <a class="hp-btn" [routerLink]="['/donor/messages', item.requestId]">{{ 'donor.invitations.openMessages' | t }}</a>
              </div>
            }
          </article>
        } @empty {
          <article class="hp-panel">
            <p class="hp-empty">{{ 'donor.invitations.emptyLong' | t }}</p>
          </article>
        }
      }
    </section>
  `
})
export class InvitationsPageComponent {
  private readonly api = inject(DonorApiService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly invitations = signal<MatchDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  reasons: Record<number, string> = {};

  constructor() {
    this.reload();
  }

  urgencyOf(urgency: string | null): string {
    if (urgency === 'CRITICAL') return this.i18n.t('urgency.inviteCritical');
    if (urgency === 'URGENT') return this.i18n.t('urgency.inviteUrgent');
    return this.i18n.enumLabel('urgency', urgency);
  }

  async accept(id: number): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('dialog.invitation.accept.title'),
      body: this.i18n.t('dialog.invitation.accept.bodyWillingness')
    });
    if (!ok) return;
    this.api.accept(id).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.invitationAccepted'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  async decline(id: number): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('dialog.invitation.decline.title'),
      body: this.i18n.t('dialog.invitation.decline.bodyOthers')
    });
    if (!ok) return;
    this.api.decline(id, this.reasons[id]).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.invitationDeclined'), 'info');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  private reload(): void {
    this.api.invitations().subscribe({
      next: (items) => {
        this.invitations.set(items);
        this.loading.set(false);
        this.error.set('');
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
