import { AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import { MedicalAudioService } from '../../audio/medical-audio.service';
import { prefersReducedMotion } from '../../core/motion';
import { onFrame } from '../../core/render-loop';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { createIntroStage, type IntroStageHandle } from '../../three/scenes/intro-scene';

interface IntroTimeline {
  dropIn: number;
  dropSettled: number;
  exitAt: number;
  endAt: number;
}

const FULL_TIMELINE: IntroTimeline = {
  dropIn: 0.12,
  dropSettled: 1.15,
  exitAt: 2.7,
  endAt: 3.6
};

const REDUCED_TIMELINE: IntroTimeline = {
  dropIn: 0.04,
  dropSettled: 0.28,
  exitAt: 0.7,
  endAt: 1.05
};

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

@Component({
  selector: 'app-intro',
  imports: [TranslatePipe],
  templateUrl: './intro.component.html',
  styleUrl: './intro.component.css'
})
export class IntroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stage') private stageRef?: ElementRef<HTMLCanvasElement>;

  @Output() completed = new EventEmitter<void>();

  readonly exiting = signal(false);
  readonly finished = signal(false);
  readonly soundOn = signal(false);

  private readonly timeline = prefersReducedMotion() ? REDUCED_TIMELINE : FULL_TIMELINE;
  private stage: IntroStageHandle | null = null;
  private stopFrames: (() => void) | null = null;
  private startTime = -1;
  private elapsedSinceStart = 0;
  private skipped = false;
  private startWatch: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly zone: NgZone,
    private readonly audio: MedicalAudioService
  ) {}

  ngAfterViewInit(): void {
    if (new URLSearchParams(location.search).has('skipIntro')) {
      this.finishNow();
      return;
    }

    this.audio.primeOnFirstGesture();
    void this.audio.enable().then((ok) => {
      if (ok) this.zone.run(() => this.soundOn.set(true));
    });

    const stageCanvas = this.stageRef?.nativeElement;
    try {
      if (stageCanvas) {
        this.zone.runOutsideAngular(() => {
          this.stage = createIntroStage(stageCanvas);
        });
      }
    } catch {
      this.stage = null;
    }

    this.zone.runOutsideAngular(() => {
      this.stopFrames = onFrame((elapsed) => this.tick(elapsed));
    });
    this.startWatch = setTimeout(() => {
      if (this.startTime < 0) this.zone.run(() => this.finishNow());
    }, 1800);
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  async unlockAudio(): Promise<void> {
    const ok = await this.audio.enable();
    this.soundOn.set(ok);
  }

  skip(): void {
    void this.unlockAudio();
    if (this.finished()) return;
    if (this.startTime < 0 || !this.stage) {
      this.finishNow();
      return;
    }
    if (this.skipped || this.elapsedSinceStart >= this.timeline.exitAt) return;
    this.skipped = true;
    this.startTime -= this.timeline.exitAt - this.elapsedSinceStart;
  }

  async toggleSound(): Promise<void> {
    if (this.soundOn()) {
      this.audio.mute();
      this.soundOn.set(false);
      return;
    }
    const ok = await this.audio.enable();
    this.soundOn.set(ok);
  }

  private tick(elapsed: number): void {
    if (this.startTime < 0) this.startTime = elapsed;
    const t = elapsed - this.startTime;
    this.elapsedSinceStart = t;

    const { dropIn, dropSettled, exitAt, endAt } = this.timeline;
    this.stage?.setReveal(clamp01((t - dropIn) / (dropSettled - dropIn)));

    if (t >= exitAt) {
      this.stage?.setExitProgress(clamp01((t - exitAt) / (endAt - exitAt)));
    }

    if (t >= exitAt && !this.exiting()) {
      this.zone.run(() => {
        this.exiting.set(true);
        this.completed.emit();
      });
    }

    if (t >= endAt && !this.finished()) {
      this.zone.run(() => this.finished.set(true));
      this.teardown();
    }
  }

  private finishNow(): void {
    if (this.finished()) return;
    this.exiting.set(true);
    this.finished.set(true);
    this.completed.emit();
    this.teardown();
  }

  private teardown(): void {
    if (this.startWatch) {
      clearTimeout(this.startWatch);
      this.startWatch = null;
    }
    this.stopFrames?.();
    this.stopFrames = null;
    this.stage?.dispose();
    this.stage = null;
    this.audio.stopFlatline(0.1);
  }
}
