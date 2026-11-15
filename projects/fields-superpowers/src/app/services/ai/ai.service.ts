import { computed, inject, Service, signal } from '@angular/core';
import { NotificationService } from '../notification.service';
import { AiSessionManager } from './ai-session';
import { getLanguageModelApi, MODEL_OPTIONS, StubModelError } from './language-model';

export type AiStatus =
  | 'checking'
  | 'unsupported'
  | 'unavailable'
  | 'needs-download'
  | 'downloading'
  | 'ready'
  | 'declined'
  | 'error';

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

@Service()
export class AiService {
  readonly #notifications = inject(NotificationService);
  readonly #session = new AiSessionManager();

  readonly #status = signal<AiStatus>('checking');
  readonly #downloadProgress = signal(0);
  readonly #lastError = signal<string | undefined>(undefined);
  readonly #downloadDialogOpen = signal(false);

  readonly status = this.#status.asReadonly();
  readonly isReady = computed(() => this.#status() === 'ready');
  readonly downloadProgress = this.#downloadProgress.asReadonly();
  readonly lastError = this.#lastError.asReadonly();
  readonly isDownloadDialogOpen = this.#downloadDialogOpen.asReadonly();

  #enabling?: Promise<void>;
  #resolveDialog?: () => void;
  #downloadAbort?: AbortController;

  /**
   * Checks model availability and, if a download is required, asks the user for consent.
   * Safe to call repeatedly (e.g. to re-enable AI after the user declined).
   */
  enable(): Promise<void> {
    this.#enabling ??= this.#doEnable().finally(() => (this.#enabling = undefined));
    return this.#enabling;
  }

  async runPrompt(prompt: string): Promise<string> {
    await this.#enabling;
    if (!this.isReady()) {
      throw new Error(this.#notReadyMessage());
    }

    try {
      return await this.#session.prompt(prompt);
    } catch (err) {
      if (isAbortError(err)) throw new Error('The AI request timed out');
      if (err instanceof StubModelError) {
        this.#markStub();
        throw new Error(this.#notReadyMessage());
      }

      // The session may have been destroyed or crashed - start fresh and retry once
      this.#session.reset();
      try {
        return await this.#session.prompt(prompt);
      } catch (retryErr) {
        void this.#revalidate();
        throw retryErr;
      }
    }
  }

  /** Must be called synchronously from a user gesture (click) - the browser requires it to download. */
  approveDownload() {
    if (!getLanguageModelApi()) return;

    this.#downloadAbort?.abort();
    const abort = (this.#downloadAbort = new AbortController());

    this.#status.set('downloading');
    this.#downloadProgress.set(0);
    this.#lastError.set(undefined);

    this.#session
      .download(abort.signal, (fraction) => this.#downloadProgress.set(fraction))
      .then(
        () => {
          if (abort.signal.aborted) return;
          this.#status.set('ready');
          this.#notifications.info('AI model downloaded and ready to use');
          this.#closeDialog();
        },
        (err) => {
          if (abort.signal.aborted) return;
          if (err instanceof StubModelError) {
            this.#markStub();
            this.#notifications.error('No on-device AI model is available in this browser');
            this.#closeDialog();
          } else {
            this.#fail(err);
          }
        },
      );
  }

  /** Closes the download dialog. Declining (or cancelling a download) disables AI. */
  dismissDownloadDialog() {
    const status = this.#status();
    if (status === 'needs-download' || status === 'downloading') {
      this.#downloadAbort?.abort();
      this.#session.reset();
      this.#status.set('declined');
      this.#notifications.info('AI features are disabled');
    }
    this.#closeDialog();
  }

  async #doEnable() {
    if (this.#status() === 'ready') return;

    const api = getLanguageModelApi();
    if (!api) {
      this.#status.set('unsupported');
      return;
    }

    this.#status.set('checking');
    try {
      const availability = await api.availability(MODEL_OPTIONS);
      switch (availability) {
        case 'available':
          await this.#session.verify();
          this.#status.set('ready');
          return;
        case 'downloadable':
        case 'downloading':
          this.#status.set('needs-download');
          await this.#openDialog();
          return;
        default:
          this.#status.set('unavailable');
          return;
      }
    } catch (err) {
      if (err instanceof StubModelError) {
        this.#markStub();
      } else {
        this.#fail(err);
      }
    }
  }

  #markStub() {
    this.#session.reset();
    this.#status.set('unavailable');
  }

  // After repeated failures, verify the model is still usable (it may have been evicted)
  async #revalidate() {
    try {
      const availability = await getLanguageModelApi()?.availability(MODEL_OPTIONS);
      if (availability === 'available') return;
    } catch {
      // fall through and re-run the enable flow
    }
    this.#session.reset();
    this.#status.set('checking');
    await this.enable();
  }

  #fail(err: unknown) {
    const message = errorMessage(err);
    this.#status.set('error');
    this.#lastError.set(message);
    this.#notifications.error(`AI error: ${message}`);
  }

  #notReadyMessage(): string {
    switch (this.#status()) {
      case 'unsupported':
        return 'The built-in browser AI model is not supported in this browser';
      case 'unavailable':
        return 'The built-in browser AI model is unavailable on this device';
      case 'declined':
        return 'AI features are disabled';
      case 'error':
        return `AI is unavailable: ${this.#lastError()}`;
      default:
        return 'AI is not ready yet';
    }
  }

  #openDialog(): Promise<void> {
    this.#downloadDialogOpen.set(true);
    return new Promise((resolve) => (this.#resolveDialog = resolve));
  }

  #closeDialog() {
    this.#downloadDialogOpen.set(false);
    this.#resolveDialog?.();
    this.#resolveDialog = undefined;
  }
}
