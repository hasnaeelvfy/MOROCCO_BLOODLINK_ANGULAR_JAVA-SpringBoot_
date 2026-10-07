import { Component } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.css'
})
export class BrandMarkComponent {
  readonly uid = `bl${Math.random().toString(36).slice(2, 9)}`;
}
