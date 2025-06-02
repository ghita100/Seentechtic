import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <button class="back-button" (click)="goBack()">
      <i class="fas fa-arrow-left"></i> Back
    </button>
  `,
  styles: [`
    .back-button {
      position: fixed !important;
      top: 20px !important;
      left: 20px !important;
      padding: 8px 20px;
      background: rgba(20, 18, 21, 0.65);
      color: #fff;
      border: 1.5px solid #ff1a1a;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9999 !important;
      font-weight: 600;
      font-size: 1.1rem;
      box-shadow: 0 2px 12px 0 rgba(255,26,26,0.12);
      backdrop-filter: blur(2px);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .back-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,26,26,0.2), transparent);
      transition: all 0.5s ease;
    }

    .back-button:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 18px 0 rgba(255,26,26,0.22);
    }

    .back-button:hover::before {
      left: 100%;
    }

    .back-button i {
      font-size: 14px;
    }
  `]
})
export class BackButtonComponent {
  @Input() navigateUrl: string | undefined;

  constructor(private location: Location, private router: Router) { }

  goBack(): void {
    if (this.navigateUrl) {
      this.router.navigate([this.navigateUrl]);
    } else {
      this.location.back();
    }
  }
}
