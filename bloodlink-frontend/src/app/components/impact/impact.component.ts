import { Component } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-impact',
  imports: [TranslatePipe],
  templateUrl: './impact.component.html'
})
export class ImpactComponent {}
