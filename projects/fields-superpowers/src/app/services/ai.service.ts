import { computed, inject, Injectable, signal } from '@angular/core';
import { NotificationService } from './notification.service';

// Minimal typings for Chrome's built-in Prompt API (on-device model)
type LanguageModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface DownloadProgressEvent extends Event {
  loaded: number;
  total?: number;
}

interface LanguageModelCreateOptions {
  expectedInputs?: { type: 'text'; languages: string[] }[];
  expectedOutputs?: { type: 'text'; languages: string[] }[];
  signal?: AbortSignal;
  monitor?: (monitor: EventTarget) => void;
}

interface LanguageModelSession {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(options?: LanguageModelCreateOptions): Promise<LanguageModelAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

export type AiStatus =
  | 'checking'
  | 'unsupported'
  | 'unavailable'
  | 'needs-download'
  | 'downloading'
  | 'ready'
  | 'declined'
  | 'error';

const MODEL_OPTIONS: LanguageModelCreateOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

const PROMPT_TIMEOUT_MS = 60_000;

// Chromium builds without the on-device model (e.g. VS Code's integrated browser) ship a stub
// Prompt API that reports itself as available but only echoes the input back
const STUB_RESPONSE = /on-device model is not available|just echoing back the input/i;

class StubModelError extends Error {
  constructor() {
    super('The browser AI API is a stub without a real on-device model');
  }
}

function getLanguageModelApi(): LanguageModelStatic | undefined {
  return (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

@Injectable({ providedIn: 'root' })
export class AiService {
  readonly #notifications = inject(NotificationService);

  readonly #status = signal<AiStatus>('checking');
  readonly #downloadProgress = signal(0);
  readonly #lastError = signal<string | undefined>(undefined);
  readonly #downloadDialogOpen = signal(false);

  readonly status = this.#status.asReadonly();
  readonly isReady = computed(() => this.#status() === 'ready');
  readonly downloadProgress = this.#downloadProgress.asReadonly();
  readonly lastError = this.#lastError.asReadonly();
  readonly isDownloadDialogOpen = this.#downloadDialogOpen.asReadonly();

  #baseSession?: Promise<LanguageModelSession>;
  #enabling?: Promise<void>;
  #resolveDialog?: () => void;
  #downloadAbort?: AbortController;

  constructor() {
    void this.enable();
  }

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
      return await this.#promptOnce(prompt);
    } catch (err) {
      if (isAbortError(err)) throw new Error('The AI request timed out');
      if (err instanceof StubModelError) {
        this.#markStub();
        throw new Error(this.#notReadyMessage());
      }

      // The session may have been destroyed or crashed - start fresh and retry once
      this.#resetSession();
      try {
        return await this.#promptOnce(prompt);
      } catch (retryErr) {
        void this.#revalidate();
        throw retryErr;
      }
    }
  }

  /** Must be called synchronously from a user gesture (click) - the browser requires it to download. */
  approveDownload() {
    const api = getLanguageModelApi();
    if (!api) return;

    this.#downloadAbort?.abort();
    const abort = (this.#downloadAbort = new AbortController());

    this.#status.set('downloading');
    this.#downloadProgress.set(0);
    this.#lastError.set(undefined);

    const created = api.create({
      ...MODEL_OPTIONS,
      signal: abort.signal,
      monitor: (m) =>
        m.addEventListener('downloadprogress', (e) => {
          const { loaded, total } = e as DownloadProgressEvent;
          this.#downloadProgress.set(total ? loaded / total : loaded);
        }),
    });
    this.#baseSession = created;

    created
      .then(() => this.#verifyModel())
      .then(
        () => {
          if (abort.signal.aborted) return;
          this.#status.set('ready');
          this.#notifications.info('AI model downloaded and ready to use');
          this.#closeDialog();
        },
        (err) => {
          if (this.#baseSession === created) this.#baseSession = undefined;
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
      this.#baseSession = undefined;
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
          await this.#verifyModel();
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

  // Sends a tiny probe prompt to make sure a real model answers (and not an echoing stub)
  async #verifyModel() {
    await this.#promptOnce('Reply with the single word: OK');
  }

  async #promptOnce(prompt: string): Promise<string> {
    const base = await this.#getBaseSession();
    // Cloning keeps each prompt independent, without accumulating conversation context
    const session = await base.clone();
    try {
      const response = await session.prompt(prompt, {
        signal: AbortSignal.timeout(PROMPT_TIMEOUT_MS),
      });
      if (STUB_RESPONSE.test(response)) throw new StubModelError();
      return response;
    } finally {
      session.destroy();
    }
  }

  #markStub() {
    this.#resetSession();
    this.#status.set('unavailable');
  }

  #getBaseSession(): Promise<LanguageModelSession> {
    if (!this.#baseSession) {
      const api = getLanguageModelApi();
      if (!api) return Promise.reject(new Error(this.#notReadyMessage()));
      const created = api.create(MODEL_OPTIONS);
      created.catch(() => {
        if (this.#baseSession === created) this.#baseSession = undefined;
      });
      this.#baseSession = created;
    }
    return this.#baseSession;
  }

  #resetSession() {
    const old = this.#baseSession;
    this.#baseSession = undefined;
    old?.then((s) => s.destroy()).catch(() => {});
  }

  // After repeated failures, verify the model is still usable (it may have been evicted)
  async #revalidate() {
    try {
      const availability = await getLanguageModelApi()?.availability(MODEL_OPTIONS);
      if (availability === 'available') return;
    } catch {
      // fall through and re-run the enable flow
    }
    this.#resetSession();
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
