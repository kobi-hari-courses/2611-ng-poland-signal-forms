import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot, max, min, minLength, required } from '@angular/forms/signals';
import { FieldWrapper } from '../../components/field-wrapper/field-wrapper';
import { SpeakerProposal } from '../../models/speaker-proposal';
import { minWords } from '../../schema-functions/min-words';

@Component({
  selector: 'app-form-demo',
  host: { class: 'demo' },
  imports: [FormField, FormRoot, FieldWrapper],
  templateUrl: './form-demo.html',
  styleUrl: './form-demo.css',
})
export class FormDemo {
  protected readonly proposal = signal<SpeakerProposal>({
    sessionType: 'full',
    longBio: '',
    shortBio: '',
    durationMinutes: 30,
    organizerNotes: '',
  });

  protected readonly proposalForm = form(this.proposal, (path) => {
    required(path.longBio, { message: 'Long bio is required.' });
    required(path.shortBio, { message: 'Short bio is required.' });

    minWords(path.longBio, (ctx) => 
      (ctx.valueOf(path.sessionType) === 'full' ? 20 : 10));

    min(path.durationMinutes, 
      (ctx) => (ctx.valueOf(path.sessionType) === 'full' ? 20 : 15), 
      {message: (ctx) => `Duration must be at least ${ctx.state.min?.()} minutes.`});

    max(path.durationMinutes, 
      (ctx) => (ctx.valueOf(path.sessionType) === 'full' ? 60 : 15), 
      {message: (ctx) => `Duration must be at most ${ctx.state.max?.()} minutes.`});
  });
}
