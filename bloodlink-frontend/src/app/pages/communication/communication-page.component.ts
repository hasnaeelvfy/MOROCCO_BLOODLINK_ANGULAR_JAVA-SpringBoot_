import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { MessageDto } from '../../core/api/api.models';
import { DonorApiService } from '../../core/api/donor-api.service';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-communication-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <div class="hp-form">
        <p class="hp-kicker">{{ code() }}</p>
        <h1>{{ title() }}</h1>
        @if (blocked()) {
          <article class="hp-panel">
            <h2>{{ 'chat.notAvailable' | t }}</h2>
            <p class="hp-note">{{ 'chat.opensAfterAccept' | t }}</p>
            <div class="hp-actions" style="margin-top:16px">
              <a class="hp-btn" [routerLink]="backLink()">{{ 'back' | t }}</a>
            </div>
          </article>
        } @else {
          <article class="hp-panel">
            <div class="chat-log">
              @for (item of messages(); track item.id) {
                <div class="chat-msg" [class.chat-msg--donor]="item.from === 'donor'" [class.chat-msg--hospital]="item.from === 'hospital'">
                  {{ item.text }}
                  <time>{{ i18n.formatTime(item.at) }}</time>
                </div>
              } @empty {
                <p class="hp-empty">{{ 'chat.empty' | t }}</p>
              }
            </div>
            <div class="hp-field"><label>{{ 'form.message' | t }}</label><textarea [(ngModel)]="draft" name="draft" maxlength="2000" [placeholder]="'chat.placeholder' | t"></textarea></div>
            <div class="hp-actions">
              <button class="hp-btn" type="button" (click)="submit()">{{ 'chat.send' | t }}</button>
              <a class="hp-btn hp-btn--ghost" [routerLink]="backLink()">{{ 'back' | t }}</a>
            </div>
          </article>
        }
      </div>
    </section>
  `
})
export class CommunicationPageComponent implements OnDestroy {
  private readonly donorApi = inject(DonorApiService);
  private readonly hospitalApi = inject(HospitalApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly requestId = inject(ActivatedRoute).snapshot.paramMap.get('requestId') ?? '';
  readonly messages = signal<MessageDto[]>([]);
  readonly blocked = signal(false);
  readonly title = signal('');
  readonly code = signal('');
  draft = '';
  private poll?: Subscription;

  constructor() {
    this.title.set(this.i18n.t('chat.title'));
    this.code.set(this.requestId ? 'BL-' + this.requestId : this.i18n.t('chat.title'));
    if (this.isDonor()) {
      this.donorApi.invitations().subscribe({
        next: (items) => {
          const match = items.find((item) => String(item.requestId) === this.requestId);
          if (match?.hospital) {
            this.title.set(match.hospital);
          }
          if (match?.publicRequestCode) {
            this.code.set(match.publicRequestCode);
          }
        }
      });
    }
    this.reload();
    this.poll = interval(4000).subscribe(() => {
      if (!this.blocked()) this.reload(true);
    });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  submit(): void {
    const value = this.draft.trim();
    if (!value) return;
    this.apiSend(value).subscribe({
      next: (message) => {
        this.messages.update((list) => list.some((item) => item.id === message.id) ? list : [...list, message]);
        this.draft = '';
      },
      error: (error) => {
        if (error.status === 400) {
          this.blocked.set(true);
        } else {
          this.toast.show(httpErrorMessage(error), 'error');
        }
      }
    });
  }

  backLink(): string[] {
    return this.isDonor() ? ['/donor/invitations'] : ['/hospital/requests', this.requestId];
  }

  private reload(silent = false): void {
    this.apiList().subscribe({
      next: (items) => {
        this.messages.set(items);
        this.blocked.set(false);
      },
      error: (error) => {
        if (error.status === 400) {
          this.blocked.set(true);
        } else if (!silent) {
          this.toast.show(httpErrorMessage(error), 'error');
        }
      }
    });
  }

  private isDonor(): boolean {
    return this.auth.currentUser()?.role === 'DONOR';
  }

  private apiList() {
    return this.isDonor() ? this.donorApi.messages(this.requestId) : this.hospitalApi.messages(this.requestId);
  }

  private apiSend(text: string) {
    return this.isDonor() ? this.donorApi.sendMessage(this.requestId, text) : this.hospitalApi.sendMessage(this.requestId, text);
  }
}
