export interface SpeakerProposal {
  sessionType: 'lightning' | 'full';
  longBio: string;
  shortBio: string;
  durationMinutes: number;
  organizerNotes: string;
}
