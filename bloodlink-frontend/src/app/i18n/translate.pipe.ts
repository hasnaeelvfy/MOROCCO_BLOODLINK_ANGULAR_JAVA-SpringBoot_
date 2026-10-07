import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string | null | undefined, params?: Record<string, string | number> | string): string {
    if (!key) return '';
    if (typeof params === 'string') {
      return this.i18n.t(key, { value: params });
    }
    return this.i18n.t(key, params);
  }
}
