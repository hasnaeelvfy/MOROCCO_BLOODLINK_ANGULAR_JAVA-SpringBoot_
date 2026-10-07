import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { createFinalDropScene, type FinalDropSceneHandle } from '../../three/scenes/final-drop-scene';

@Component({
  selector: 'app-final-cta',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './final-cta.component.html'
})
export class FinalCtaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('drop') private dropRef?: ElementRef<HTMLCanvasElement>;

  private scene: FinalDropSceneHandle | null = null;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    const canvas = this.dropRef?.nativeElement;
    if (!canvas) return;

    this.zone.runOutsideAngular(() => {
      this.scene = createFinalDropScene(canvas);
    });
  }

  ngOnDestroy(): void {
    this.scene?.dispose();
    this.scene = null;
  }
}
