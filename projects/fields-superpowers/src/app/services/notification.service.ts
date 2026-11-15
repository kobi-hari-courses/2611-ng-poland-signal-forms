import { Injectable, signal } from '@angular/core';

export type NotificationKind = 'info' | 'error';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  message: string;
}

const AUTO_DISMISS_MS = 3000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly #notifications = signal<AppNotification[]>([]);
  readonly notifications = this.#notifications.asReadonly();

  #nextId = 0;

  info(message: string) {
    this.#show('info', message);
  }

  error(message: string) {
    this.#show('error', message);
  }

  dismiss(id: number) {
    this.#notifications.update((list) => list.filter((n) => n.id !== id));
  }

  #show(kind: NotificationKind, message: string) {
    const id = this.#nextId++;
    this.#notifications.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
  }
}
