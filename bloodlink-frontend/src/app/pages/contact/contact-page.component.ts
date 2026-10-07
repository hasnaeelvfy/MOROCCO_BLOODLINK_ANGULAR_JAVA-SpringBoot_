import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-contact-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'pages.contact.title' | t }}</p>
        <h1>{{ 'pages.contact.headline' | t }}</h1>
        @if (sent()) {
          <article class="glass request app-card">
            <h3>{{ 'pages.contact.received' | t }}</h3>
            <p class="note">{{ 'pages.contact.thanks' | t }}</p>
            <button class="button button--ghost" type="button" (click)="sent.set(false)">{{ 'back' | t }}</button>
          </article>
        } @else {
          <article class="glass request app-card">
            <div class="field"><label>{{ 'form.name' | t }}</label><input [(ngModel)]="name" name="name" /></div>
            <div class="field"><label>{{ 'email' | t }}</label><input type="email" [(ngModel)]="email" name="email" /></div>
            <div class="field"><label>{{ 'phone' | t }}</label><input [(ngModel)]="phone" name="phone" /></div>
            <div class="field"><label>{{ 'form.subject' | t }}</label><input [(ngModel)]="subject" name="subject" /></div>
            <div class="field"><label>{{ 'form.message' | t }}</label><textarea [(ngModel)]="message" name="message"></textarea></div>
            <button class="button" type="button" (click)="submit()">{{ 'submit' | t }}</button>
          </article>
        }
      </div>
    </main>
  `
})
export class ContactPageComponent {
  name = '';
  email = '';
  phone = '';
  subject = '';
  message = '';
  readonly sent = signal(false);

  submit(): void {
    const existing = JSON.parse(localStorage.getItem('bloodlink.contact') ?? '[]') as unknown[];
    existing.unshift({
      name: this.name,
      email: this.email,
      phone: this.phone,
      subject: this.subject,
      message: this.message,
      at: new Date().toISOString()
    });
    localStorage.setItem('bloodlink.contact', JSON.stringify(existing));
    this.sent.set(true);
  }
}
