import { Component } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-how-it-works',
  imports: [TranslatePipe],
  templateUrl: './how-it-works.component.html'
})
export class HowItWorksComponent {}
