import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import { EmergencyComponent } from '../../components/emergency/emergency.component';
import { FinalCtaComponent } from '../../components/final-cta/final-cta.component';
import { HeroComponent } from '../../components/hero/hero.component';
import { HowItWorksComponent } from '../../components/how-it-works/how-it-works.component';
import { ImpactComponent } from '../../components/impact/impact.component';
import { IntroComponent } from '../../components/intro/intro.component';
import { NetworkComponent } from '../../components/network/network.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { SiteNavComponent } from '../../components/site-nav/site-nav.component';
import { UrgentTickerComponent } from '../../components/urgent-ticker/urgent-ticker.component';
import { PublicApiService } from '../../core/api/public-api.service';
import { initUiInteractions } from '../../ui/interactions';

let introPlayed = false;

@Component({
  selector: 'app-landing',
  imports: [
    IntroComponent,
    SiteNavComponent,
    UrgentTickerComponent,
    HeroComponent,
    NetworkComponent,
    EmergencyComponent,
    ImpactComponent,
    HowItWorksComponent,
    FinalCtaComponent,
    SiteFooterComponent
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  readonly showIntro = signal(!introPlayed);
  private disposeInteractions: (() => void) | null = null;
  private failsafe: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly publicApi: PublicApiService) {
    this.publicApi.load().subscribe({ error: () => this.publicApi.requests.set([]) });
    if (this.showIntro()) document.body.classList.add('intro-lock');
    else document.body.classList.remove('intro-lock');
  }

  ngAfterViewInit(): void {
    for (const target of Array.from(document.querySelectorAll<HTMLElement>('.reveal'))) {
      target.classList.add('visible');
    }
    try {
      this.disposeInteractions = initUiInteractions();
    } catch {
      this.disposeInteractions = null;
    }
    if (this.showIntro()) {
      this.failsafe = setTimeout(() => this.onIntroDone(), 4500);
    }
  }

  onIntroDone(): void {
    if (this.failsafe) {
      clearTimeout(this.failsafe);
      this.failsafe = null;
    }
    introPlayed = true;
    this.showIntro.set(false);
    document.body.classList.remove('intro-lock');
  }

  ngOnDestroy(): void {
    if (this.failsafe) clearTimeout(this.failsafe);
    document.body.classList.remove('intro-lock');
    this.disposeInteractions?.();
  }
}
