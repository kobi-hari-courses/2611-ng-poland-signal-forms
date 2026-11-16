import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot, max, min, minLength, required } from '@angular/forms/signals';
import { SpeakerProposal } from '../../models/speaker-proposal';

@Component({
  selector: 'app-form-demo',
  host: { class: 'demo' },
  imports: [FormField, FormRoot],
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

    minLength(path.longBio, ({ valueOf }) => (valueOf(path.sessionType) === 'full' ? 100 : 50), {
      message: ({ state }) => `Long bio must contain at least ${state.minLength?.()} characters.`,
    });

    min(path.durationMinutes, ({ valueOf }) => (valueOf(path.sessionType) === 'full' ? 20 : 15), {
      message: ({ state }) => `Duration must be at least ${state.min?.()} minutes.`,
    });
    max(path.durationMinutes, ({ valueOf }) => (valueOf(path.sessionType) === 'full' ? 60 : 15), {
      message: ({ state }) => `Duration must be at most ${state.max?.()} minutes.`,
    });
  });
}
