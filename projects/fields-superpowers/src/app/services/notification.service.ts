import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  DOCUMENT,
  EnvironmentInjector,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { NotificationsHost } from './notifications-host';

export type NotificationKind = 'info' | 'error';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  message: string;
}

const AUTO_DISMISS_MS = 3000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly #appRef = inject(ApplicationRef);
  readonly #injector = inject(EnvironmentInjector);
  readonly #document = inject(DOCUMENT);

  readonly #notifications = signal<AppNotification[]>([]);
  readonly notifications = this.#notifications.asReadonly();

  #nextId = 0;
  #host?: ComponentRef<NotificationsHost>;

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
    this.#ensureHost();
    const id = this.#nextId++;
    this.#notifications.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
  }

  // Lazily mounts the snackbar container on <body>, so no template changes are needed
  #ensureHost() {
    if (this.#host) return;
    this.#host = createComponent(NotificationsHost, { environmentInjector: this.#injector });
    this.#appRef.attachView(this.#host.hostView);
    this.#document.body.appendChild(this.#host.location.nativeElement);
  }
}
