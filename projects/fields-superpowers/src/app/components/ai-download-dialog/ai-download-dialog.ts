import { Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-ai-download-dialog',
  templateUrl: './ai-download-dialog.html',
  styleUrl: './ai-download-dialog.css',
})
export class AiDownloadDialog {
  readonly #ai = inject(AiService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly status = this.#ai.status;
  protected readonly progress = this.#ai.downloadProgress;
  protected readonly error = this.#ai.lastError;
  protected readonly percent = computed(() => Math.round(this.progress() * 100));

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      const shouldBeOpen = this.#ai.isDownloadDialogOpen();
      if (shouldBeOpen && !dialog.open) dialog.showModal();
      if (!shouldBeOpen && dialog.open) dialog.close();
    });
  }

  protected download() {
    this.#ai.approveDownload();
  }

  protected dismiss() {
    this.#ai.dismissDownloadDialog();
  }

  // Escape key: let the service decide instead of letting the browser close the dialog
  protected onEscape(event: Event) {
    event.preventDefault();
    this.dismiss();
  }

  // The browser may close the dialog without a cancel event (e.g. Escape without user activation)
  protected onClosed() {
    if (this.#ai.isDownloadDialogOpen()) this.dismiss();
  }
}
