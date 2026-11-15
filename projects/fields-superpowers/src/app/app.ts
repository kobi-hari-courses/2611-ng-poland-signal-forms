import { Component, computed, inject, signal } from '@angular/core';
import { AiDownloadDialog } from './components/ai-download-dialog/ai-download-dialog';
import { NotificationsHost } from './components/notifications-host/notifications-host';
import { AiService } from './services/ai/ai.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  imports: [NotificationsHost, AiDownloadDialog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly ai = inject(AiService);
  readonly #notifications = inject(NotificationService);

  protected readonly message = signal('Hello from the notification service!');
  protected readonly prompt = signal('Write a short, funny bio for a developer named Kobi.');
  protected readonly answer = signal('');
  protected readonly isRunning = signal(false);

  protected readonly canEnable = computed(() => ['declined', 'error'].includes(this.ai.status()));
  protected readonly canRun = computed(
    () => this.ai.isReady() && !this.isRunning() && this.prompt().trim() !== '',
  );

  protected showInfo() {
    this.#notifications.info(this.message());
  }

  protected showError() {
    this.#notifications.error(this.message());
  }

  protected async runPrompt() {
    this.isRunning.set(true);
    this.answer.set('');
    try {
      this.answer.set(await this.ai.runPrompt(this.prompt()));
      this.#notifications.info('AI response received');
    } catch (err) {
      this.#notifications.error(err instanceof Error ? err.message : String(err));
    } finally {
      this.isRunning.set(false);
    }
  }
}
