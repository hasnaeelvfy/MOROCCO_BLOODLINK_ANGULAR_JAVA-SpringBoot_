import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { onFrame } from '../core/render-loop';
import { createIntroStage, type IntroStageHandle } from '../three/scenes/intro-scene';
import { RouteTransitionService } from './route-transition.service';

@Component({
  selector: 'app-route-transition',
  template: `
    @if (transition.active()) {
      <div class="route-transition" role="presentation" aria-hidden="true">
        <canvas #stage class="route-transition__stage"></canvas>
        <div class="route-transition__vignette"></div>
      </div>
    }
  `,
  styles: [`
    .route-transition {
      position: fixed;
      inset: 0;
      z-index: 90;
      overflow: hidden;
      background: radial-gradient(ellipse at 50% 36%, #160408 0%, #080204 52%, #030102 100%);
      pointer-events: none;
      animation: route-fade 3s cubic-bezier(0.55, 0, 0.28, 1) forwards;
    }
    .route-transition__stage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .route-transition__vignette {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 50% 36%, transparent 0 18%, rgba(5, 2, 5, 0.28) 52%, rgba(2, 1, 2, 0.96) 100%);
    }
    @keyframes route-fade {
      0% { opacity: 1; }
      72% { opacity: 1; }
      100% { opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .route-transition { animation-duration: 0.4s; }
    }
  `]
})
export class RouteTransitionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stage') private stageRef?: ElementRef<HTMLCanvasElement>;
  readonly transition = inject(RouteTransitionService);
  private stage: IntroStageHandle | null = null;
  private stop: (() => void) | null = null;
  private readonly zone = inject(NgZone);

  constructor() {
    effect(() => {
      if (this.transition.active()) queueMicrotask(() => this.mount());
      else this.teardown();
    });
  }

  ngAfterViewInit(): void {
    if (this.transition.active()) this.mount();
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  private mount(): void {
    this.teardown();
    const canvas = this.stageRef?.nativeElement;
    if (!canvas) {
      if (this.transition.active()) setTimeout(() => this.mount(), 30);
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.stage = createIntroStage(canvas);
      const start = performance.now();
      this.stop = onFrame(() => {
        const t = (performance.now() - start) / 1000;
        this.stage?.setReveal(Math.min(1, t / 0.9));
        if (t > 0.8) this.stage?.pulse();
        if (t > 2.1) this.stage?.setExitProgress(Math.min(1, (t - 2.1) / 0.8));
      });
    });
  }

  private teardown(): void {
    this.stop?.();
    this.stop = null;
    this.stage?.dispose();
    this.stage = null;
  }
}
