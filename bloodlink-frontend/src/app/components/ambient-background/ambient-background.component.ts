import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { createAmbientScene, type AmbientSceneHandle } from '../../three/scenes/ambient-scene';

/**
 * Page-wide 3D backdrop. Lives behind every section so the whole site shares
 * one continuous depth field instead of isolated 3D islands.
 */
@Component({
  selector: 'app-ambient-background',
  template: `
    <div class="ambient" aria-hidden="true">
      <canvas #canvas class="ambient__canvas"></canvas>
      <div class="ambient__grid"></div>
    </div>
  `,
  styleUrl: './ambient-background.component.css'
})
export class AmbientBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private scene: AmbientSceneHandle | null = null;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.zone.runOutsideAngular(() => {
      try {
        this.scene = createAmbientScene(canvas);
      } catch {
        this.scene = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
    this.scene = null;
  }
}
