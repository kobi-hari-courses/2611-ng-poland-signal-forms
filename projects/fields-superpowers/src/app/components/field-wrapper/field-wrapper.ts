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
  protected readonly hints = computed(() =>
    [
      getMinMaxHint(this.state()), 
      getMinMaxLengthHint(this.state())
    ].filter((hint) => hint !== null),
  );
}
