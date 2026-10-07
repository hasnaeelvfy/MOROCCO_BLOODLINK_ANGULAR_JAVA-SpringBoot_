import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { mediaUrl } from '../core/api/api.models';

@Component({
  selector: 'app-profile-photo',
  template: `
    @if (displayUrl) {
      <img [src]="displayUrl" [alt]="alt" />
    } @else {
      <span>{{ initials }}</span>
    }
  `
})
export class ProfilePhotoComponent implements OnChanges, OnDestroy {
  private readonly http = inject(HttpClient);
  @Input() url: string | null | undefined;
  @Input() alt = '';
  @Input() initials = 'BL';
  @Input() authenticated = false;
  displayUrl: string | null = null;
  private objectUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['url'] && !changes['authenticated']) {
      return;
    }
    this.revoke();
    const resolved = mediaUrl(this.url);
    if (!resolved) {
      this.displayUrl = null;
      return;
    }
    if (!this.authenticated) {
      this.displayUrl = resolved;
      return;
    }
    this.http.get(resolved, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.displayUrl = this.objectUrl;
      },
      error: () => {
        this.displayUrl = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.revoke();
  }

  private revoke(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
