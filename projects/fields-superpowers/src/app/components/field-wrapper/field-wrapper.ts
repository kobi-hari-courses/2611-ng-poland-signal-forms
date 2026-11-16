import { Component, computed, contentChild, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { getMinMaxHint, getMinMaxLengthHint } from './field-hints';

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

  readonly hints = computed(() =>
    [
      getMinMaxHint(this.state().min?.(), this.state().max?.()), 
      getMinMaxLengthHint(this.state().minLength?.(), this.state().maxLength?.()) 
    ].filter((hint) => hint !== null),
  );
}
