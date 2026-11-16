import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
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

  protected readonly proposalForm = form(this.proposal);
}
