import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<ToastItem[]>([]);
  private seq = 0;

  show(message: string, kind: ToastItem['kind'] = 'info'): void {
    const id = ++this.seq;
    this.items.update((list) => [...list, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), 4200);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
  }
}
