import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { MedicalAudioService } from '../../audio/medical-audio.service';
import { createHeroScene, type HeroSceneHandle } from '../../three/scenes/hero-scene';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stage') private stageRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('orbit') private orbitRef?: ElementRef<HTMLElement>;

  private scene: HeroSceneHandle | null = null;
  private readonly i18n = inject(I18nService);

  constructor(
    private readonly zone: NgZone,
    private readonly audio: MedicalAudioService
  ) {
    effect(() => {
      this.i18n.locale();
      this.scene?.relayout();
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.stageRef?.nativeElement;
    if (!canvas) return;

    this.audio.primeOnFirstGesture();
    const orbit = this.orbitRef?.nativeElement ?? canvas;
    orbit.addEventListener('pointerdown', () => {
      void this.audio.enable();
    });

    try {
      this.zone.runOutsideAngular(() => {
        this.scene = createHeroScene(canvas, {
          orbitEl: orbit,
          onBeat: () => {
            if (!this.audio.enabled) return;
            this.audio.heartbeat(this.audio.currentTime, 0.64);
          }
        });
      });
    } catch {
      this.scene = null;
    }
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
    this.scene = null;
  }
}
