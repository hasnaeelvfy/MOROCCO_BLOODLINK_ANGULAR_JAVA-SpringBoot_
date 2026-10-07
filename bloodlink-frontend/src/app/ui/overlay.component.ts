import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { DialogService } from './dialog.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-ui-overlay',
  imports: [TranslatePipe],
  template: `
    @if (dialog.current(); as item) {
      <div class="ui-backdrop" role="dialog" aria-modal="true">
        <div class="glass request app-card ui-dialog">
          <p class="eyebrow">{{ item.danger ? ('dialog.confirmTitleDanger' | t) : ('dialog.pleaseConfirm' | t) }}</p>
          <h3>{{ item.title }}</h3>
          <p class="note">{{ item.body }}</p>
          <div class="actions">
            <button class="button" type="button" (click)="dialog.close(true)">{{ item.confirmLabel }}</button>
            <button class="button button--ghost" type="button" (click)="dialog.close(false)">{{ item.cancelLabel }}</button>
          </div>
        </div>
      </div>
    }
    <div class="ui-toasts" aria-live="polite">
      @for (toast of toasts.items(); track toast.id) {
        <button class="glass list-card ui-toast" type="button" (click)="toasts.dismiss(toast.id)">{{ toast.message }}</button>
      }
    </div>
  `
})
/** Dialog and toast overlay chrome. */
export class UiOverlayComponent {
  readonly dialog = inject(DialogService);
  readonly toasts = inject(ToastService);
}

