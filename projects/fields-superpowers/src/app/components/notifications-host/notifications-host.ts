import { Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications-host',
  templateUrl: './notifications-host.html',
  styleUrl: './notifications-host.css',
})
export class NotificationsHost {
  readonly #notificationService = inject(NotificationService);

  protected readonly notifications = this.#notificationService.notifications;

  protected dismiss(id: number) {
    this.#notificationService.dismiss(id);
  }
}
