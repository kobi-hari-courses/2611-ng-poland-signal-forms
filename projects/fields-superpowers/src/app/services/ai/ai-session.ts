import {
  DownloadProgressEvent,
  getLanguageModelApi,
  isStubResponse,
  LanguageModelSession,
  MODEL_OPTIONS,
  StubModelError,
} from './language-model';

const PROMPT_TIMEOUT_MS = 60_000;

/**
 * Owns the lifecycle of the underlying Prompt API session: lazy creation, model download with
 * progress reporting, per-prompt cloning, and disposal. Intentionally framework-agnostic.
 */
export class AiSessionManager {
  #baseSession?: Promise<LanguageModelSession>;

  /** Sends a single prompt on a cloned session, so prompts never accumulate context. */
  async prompt(prompt: string): Promise<string> {
    const base = await this.#getBaseSession();
    const session = await base.clone();
    try {
      const response = await session.prompt(prompt, {
        signal: AbortSignal.timeout(PROMPT_TIMEOUT_MS),
      });
      if (isStubResponse(response)) throw new StubModelError();
      return response;
    } finally {
      session.destroy();
    }
  }

  /** Sends a tiny probe prompt to make sure a real model answers (and not an echoing stub). */
  async verify(): Promise<void> {
    await this.prompt('Reply with the single word: OK');
  }

  /**
   * Creates the base session (triggering the model download if needed) and verifies the result.
   * Must be started synchronously from a user gesture (click) - the browser requires it.
   */
  download(signal: AbortSignal, onProgress: (fraction: number) => void): Promise<void> {
    const api = getLanguageModelApi();
    if (!api) return Promise.reject(new Error('The browser Prompt API is not available'));

    const created = api.create({
      ...MODEL_OPTIONS,
      signal,
      monitor: (m) =>
        m.addEventListener('downloadprogress', (e) => {
          const { loaded, total } = e as DownloadProgressEvent;
          onProgress(total ? loaded / total : loaded);
        }),
    });
    this.#baseSession = created;

    const result = created.then(() => this.verify());
    result.catch(() => {
      if (this.#baseSession === created) this.#baseSession = undefined;
    });
    return result;
  }

  /** Destroys the current base session (if any); the next prompt creates a fresh one. */
  reset(): void {
    const old = this.#baseSession;
    this.#baseSession = undefined;
    old?.then((s) => s.destroy()).catch(() => {});
  }

  #getBaseSession(): Promise<LanguageModelSession> {
    if (!this.#baseSession) {
      const api = getLanguageModelApi();
      if (!api) return Promise.reject(new Error('The browser Prompt API is not available'));
      const created = api.create(MODEL_OPTIONS);
      created.catch(() => {
        if (this.#baseSession === created) this.#baseSession = undefined;
      });
      this.#baseSession = created;
    }
    return this.#baseSession;
  }
}
