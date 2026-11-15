import { Component, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notifications-host',
  template: `
    @for (n of service.notifications(); track n.id) {
      <button
        type="button"
        class="snackbar"
        [class]="n.kind"
        title="Click to dismiss"
        (click)="service.dismiss(n.id)"
      >
        {{ n.message }}
      </button>
    }
  `,
  styles: `
    :host {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
    }

    .snackbar {
      min-width: 280px;
      max-width: 560px;
      padding: 12px 20px;
      border-radius: 6px;
      border: 1px solid;
      font: inherit;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
      animation: slide-in 200ms ease-out;
    }

    .info {
      background: #e8f5e9;
      border-color: #43a047;
      color: #1b5e20;
    }

    .error {
      background: #ffebee;
      border-color: #e53935;
      color: #b71c1c;
    }

    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
    }
  `,
})
export class NotificationsHost {
  protected readonly service = inject(NotificationService);
}
