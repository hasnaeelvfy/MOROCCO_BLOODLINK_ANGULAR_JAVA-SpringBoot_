import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from './i18n.service';
import { AppLocale, LOCALE_OPTIONS } from './locale';
import { TranslatePipe } from './translate.pipe';

@Component({
  selector: 'app-language-switcher',
  imports: [FormsModule, TranslatePipe],
  template: `
    <label class="lang-switch">
      <span class="lang-switch__label">{{ 'language' | t }}</span>
      <select
        class="lang-switch__select"
        [ngModel]="i18n.locale()"
        (ngModelChange)="onChange($event)"
        [attr.aria-label]="'language' | t"
      >
        @for (option of options; track option.code) {
          <option [value]="option.code">{{ option.label }}</option>
        }
      </select>
    </label>
  `
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  readonly options = LOCALE_OPTIONS;

  onChange(locale: AppLocale): void {
    this.i18n.set(locale);
    this.auth.persistLocale(locale);
  }
}
