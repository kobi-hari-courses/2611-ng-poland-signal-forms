import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { NotificationKind, NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-demo',
  host: { class: 'demo' },
  imports: [FormField],
  templateUrl: './notification-demo.html',
  styleUrl: './notification-demo.css',
})
export class NotificationDemo {
  readonly #notifications = inject(NotificationService);
  protected readonly message = signal('Hello from the notification service!');
  protected readonly messageField = form(this.message);

  protected show(kind: NotificationKind) {
    this.#notifications[kind](this.message());
  }
}
