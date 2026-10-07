import { Component, inject } from '@angular/core';
import { PublicApiService } from '../../core/api/public-api.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-emergency',
  imports: [TranslatePipe],
  templateUrl: './emergency.component.html'
})
export class EmergencyComponent {
  readonly feed = inject(PublicApiService);
  readonly i18n = inject(I18nService);

  pad(units: number): string {
    return String(units).padStart(2, '0');
  }
}
