import { Injectable, inject, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

export interface DialogRequest {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogState extends DialogRequest {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly i18n = inject(I18nService);
  readonly current = signal<DialogState | null>(null);

  confirm(request: DialogRequest): Promise<boolean> {
    return new Promise((resolve) => {
      this.current.set({
        confirmLabel: this.i18n.t('dialog.confirmLabel'),
        cancelLabel: this.i18n.t('dialog.cancelLabel'),
        ...request,
        resolve
      });
    });
  }

  close(result: boolean): void {
    const current = this.current();
    this.current.set(null);
    current?.resolve(result);
  }
}
