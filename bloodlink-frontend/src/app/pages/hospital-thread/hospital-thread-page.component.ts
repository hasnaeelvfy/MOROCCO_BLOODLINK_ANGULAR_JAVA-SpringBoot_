import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { MessageDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-hospital-thread-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <div class="hp-form">
        <p class="hp-kicker">{{ 'chat.title' | t }}</p>
        <h1>{{ requestId }}</h1>
        <p class="hp-lead">{{ 'hospital.thread.lead' | t }}</p>
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
            <a class="hp-btn hp-btn--ghost" routerLink="/hospital/messages">{{ 'back' | t }}</a>
          </div>
          @if (sent()) { <p class="hp-note">{{ 'success' | t }}</p> }
        </article>
      </div>
    </section>
  `
})
export class HospitalThreadPageComponent implements OnDestroy {
  private readonly api = inject(HospitalApiService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly requestId = inject(ActivatedRoute).snapshot.paramMap.get('requestId') ?? '';
  readonly messages = signal<MessageDto[]>([]);
  readonly sent = signal(false);
  draft = '';
  private poll?: Subscription;

  constructor() {
    this.reload();
    this.poll = interval(4000).subscribe(() => this.reload(true));
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  submit(): void {
    const value = this.draft.trim();
    if (!value) return;
    this.api.sendMessage(this.requestId, value).subscribe({
      next: (message) => {
        this.messages.update((list) => list.some((item) => item.id === message.id) ? list : [...list, message]);
        this.draft = '';
        this.sent.set(true);
        this.toast.show(this.i18n.t('toast.messageSent'), 'success');
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  private reload(silent = false): void {
    this.api.messages(this.requestId).subscribe({
      next: (items) => this.messages.set(items),
      error: (error) => {
        if (!silent) this.toast.show(httpErrorMessage(error), 'error');
      }
    });
  }
}
