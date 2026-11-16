import { Component, computed, contentChild, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { getMinMaxHint, getMinMaxLengthHint, getMinWordsHint } from './field-hints';
import { MIN_WORDS } from '../../schema-functions/min-words';

@Component({
  selector: 'app-field-wrapper',
  templateUrl: './field-wrapper.html',
  styleUrl: './field-wrapper.css',
  host: { class: 'field' },
})
export class FieldWrapper {
  readonly label = input.required<string>();

  readonly formField = contentChild.required(FormField);

  readonly state = computed(() => this.formField().state());

  readonly required = computed(() => this.state().required());
  readonly touched = computed(() => this.state().touched());
  readonly errors = computed(() => this.state().errors());
  readonly minWords = computed(() => this.state().metadata(MIN_WORDS)?.()); 

  readonly hints = computed(() =>
    [
      getMinWordsHint(this.minWords()),
      getMinMaxHint(this.state().min?.(), this.state().max?.()), 
      getMinMaxLengthHint(this.state().minLength?.(), this.state().maxLength?.()) 
    ].filter((hint) => hint !== null),
  );
}
