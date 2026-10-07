import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { BrandMarkComponent } from '../brand-mark/brand-mark.component';

@Component({
  selector: 'app-site-footer',
  imports: [BrandMarkComponent, RouterLink, TranslatePipe],
  templateUrl: './site-footer.component.html'
})
export class SiteFooterComponent {
  home(): boolean {
    return true;
  }
}
