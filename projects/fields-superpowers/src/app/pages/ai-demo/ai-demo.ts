import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { AiService, AiStatus } from '../../services/ai/ai.service';

const AI_STATUS_MESSAGES: Record<AiStatus, string> = {
  checking: 'Checking on-device AI support...',
  unsupported: 'On-device AI is not supported in this browser.',
  unavailable: 'On-device AI is supported, but no model is available on this device.',
  'needs-download': 'On-device AI is supported. Download the model to get started.',
  downloading: 'Downloading the on-device AI model...',
  ready: 'On-device AI is supported and ready.',
  declined: 'On-device AI is supported, but AI features are disabled.',
  error: 'AI could not be enabled. Try enabling it again.',
};

const AI_STATUS_LABELS: Record<AiStatus, string> = {
  checking: 'Checking',
  unsupported: 'Not supported',
  unavailable: 'Unavailable',
  'needs-download': 'Download required',
  downloading: 'Downloading',
  ready: 'Ready',
  declined: 'Not enabled',
  error: 'Error',
};

@Component({
  selector: 'app-ai-demo',
  host: { class: 'demo' },
  imports: [FormField, FormRoot],
  templateUrl: './ai-demo.html',
  styleUrl: './ai-demo.css',
})
export class AiDemo {
  protected readonly ai = inject(AiService);
  protected readonly prompt = signal('');
  protected readonly result = signal('');
  protected readonly promptField = form(this.prompt, {
    submission: {
      action: async (field) => {
        const prompt = field().value();
        if (!prompt.trim()) {
          return { kind: 'required', message: 'Enter a prompt.' };
        }

        this.result.set('');
        try {
          this.result.set(await this.ai.runPrompt(prompt));
          return undefined;
        } catch (error) {
          return {
            kind: 'ai',
            message: error instanceof Error ? error.message : String(error),
          };
        }
      },
    },
  });
  protected readonly statusLabel = computed(() => AI_STATUS_LABELS[this.ai.status()]);
  protected readonly statusMessage = computed(() => AI_STATUS_MESSAGES[this.ai.status()]);
  protected readonly canEnable = computed(() => ['declined', 'error'].includes(this.ai.status()));
  protected readonly canSend = computed(
    () =>
      this.ai.isReady() &&
      !this.promptField().submitting() &&
      !this.promptField().invalid() &&
      this.prompt().trim() !== '',
  );
}
