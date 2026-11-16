import {
  Component,
  computed,
  contentChild,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { FILLABLE_BY_AI } from '../../schema-functions/fillable-by-ai';
import { FormField } from '@angular/forms/signals';
import { getMinMaxHint, getMinMaxLengthHint, getMinWordsHint } from './field-hints';
import { MIN_WORDS } from '../../schema-functions/min-words';
import { COPYABLE } from '../../schema-functions/copyable';
import { ClipboardService } from '../../services/clipboard.service';
import { AiService } from '../../services/ai/ai.service';

@Component({
  selector: 'app-field-wrapper',
  templateUrl: './field-wrapper.html',
  styleUrl: './field-wrapper.css',
  host: { class: 'field' },
})
export class FieldWrapper {
  readonly clipboard = inject(ClipboardService);
  readonly aiService = inject(AiService);
  readonly label = input.required<string>();

  readonly formField = contentChild.required(FormField);

  readonly state = computed(() => this.formField().state());

  readonly required = computed(() => this.state().required());
  readonly touched = computed(() => this.state().touched());
  readonly errors = computed(() => this.state().errors());
  readonly minWords = computed(() => this.state().metadata(MIN_WORDS)?.());

  readonly copyable = computed(() => this.state().metadata(COPYABLE)?.() ?? false);
  readonly autoFillPrompt = computed(() => this.state().metadata(FILLABLE_BY_AI)?.() ?? '');

  readonly canBeFilledByAI = computed(() => this.autoFillPrompt() !== '');

  readonly aiTrigger = signal<string | undefined>(undefined);
  readonly aiResource = resource({
    params: this.aiTrigger,
    loader: ({ params }) => this.aiService.runPrompt(params ?? ''),
  });

  fillByAI() {
    this.aiTrigger.set(this.autoFillPrompt());
  }

  readonly hints = computed(() =>
    [
      getMinWordsHint(this.minWords()),
      getMinMaxHint(this.state().min?.(), this.state().max?.()),
      getMinMaxLengthHint(this.state().minLength?.(), this.state().maxLength?.()),
    ].filter((hint) => hint !== null),
  );

  copyToClipboard(): Promise<void> {
    return this.clipboard.copy(String(this.state().value()));
  }

  constructor() {
    effect(() => {
      if (this.aiResource.status() === 'resolved' 
        && this.aiResource.hasValue()) {
          const value = this.aiResource.value();
          untracked(() => this.state().value.set(value));
      }
    });
  }
}
