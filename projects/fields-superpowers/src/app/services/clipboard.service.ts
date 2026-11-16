import { inject, Service } from '@angular/core';
import { NotificationService } from './notification.service';

@Service()
export class ClipboardService {
  readonly #notifications = inject(NotificationService);

  async copy(text: string): Promise<void> {
    if (!navigator.clipboard?.writeText) {
      this.#notifications.error('Clipboard access is not available in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      this.#notifications.error('Could not copy to clipboard. Check your browser permissions.');
      return;
    }

    this.#notifications.info('Copied to clipboard');
  }
}
