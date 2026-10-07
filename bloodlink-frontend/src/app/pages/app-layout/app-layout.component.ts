import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { SiteNavComponent } from '../../components/site-nav/site-nav.component';
import { initUiInteractions } from '../../ui/interactions';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SiteNavComponent, SiteFooterComponent],
  template: `
    <app-site-nav />
    <router-outlet />
    <app-site-footer />
  `
})
export class AppLayoutComponent implements AfterViewInit, OnDestroy {
  private dispose: (() => void) | null = null;

  ngAfterViewInit(): void {
    this.dispose = initUiInteractions();
  }

  ngOnDestroy(): void {
    this.dispose?.();
  }
}
