// Minimal typings and access helpers for Chrome's built-in Prompt API (on-device model)

export type LanguageModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

export interface DownloadProgressEvent extends Event {
  loaded: number;
  total?: number;
}

export interface LanguageModelCreateOptions {
  expectedInputs?: { type: 'text'; languages: string[] }[];
  expectedOutputs?: { type: 'text'; languages: string[] }[];
  signal?: AbortSignal;
  monitor?: (monitor: EventTarget) => void;
}

export interface LanguageModelSession {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
  destroy(): void;
}

export interface LanguageModelStatic {
  availability(options?: LanguageModelCreateOptions): Promise<LanguageModelAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

export const MODEL_OPTIONS: LanguageModelCreateOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

// Chromium builds without the on-device model (e.g. VS Code's integrated browser) ship a stub
// Prompt API that reports itself as available but only echoes the input back
const STUB_RESPONSE = /on-device model is not available|just echoing back the input/i;

export class StubModelError extends Error {
  constructor() {
    super('The browser AI API is a stub without a real on-device model');
  }
}

export function isStubResponse(response: string): boolean {
  return STUB_RESPONSE.test(response);
}

export function getLanguageModelApi(): LanguageModelStatic | undefined {
  return (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}
