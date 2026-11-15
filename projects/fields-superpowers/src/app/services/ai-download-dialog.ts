import { Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core';
import { AiService } from './ai.service';

@Component({
  selector: 'app-ai-download-dialog',
  template: `
    <dialog #dialog (cancel)="onEscape($event)" (close)="onClosed()">
      @switch (ai.status()) {
        @case ('downloading') {
          <h2>Downloading AI model...</h2>
          <progress [value]="ai.downloadProgress()" max="1"></progress>
          <p class="percent">{{ percent() }}%</p>
          <div class="actions">
            <button type="button" class="secondary" (click)="ai.dismissDownloadDialog()">Cancel</button>
          </div>
        }
        @case ('error') {
          <h2>Download failed</h2>
          <p class="error">{{ ai.lastError() }}</p>
          <div class="actions">
            <button type="button" class="secondary" (click)="ai.dismissDownloadDialog()">Close</button>
            <button type="button" (click)="ai.approveDownload()">Retry</button>
          </div>
        }
        @default {
          <h2>Enable AI features?</h2>
          <p>
            This app uses an AI model that runs locally in your browser. It requires a one-time
            download, which may be large. Do you want to download it now?
          </p>
          <div class="actions">
            <button type="button" class="secondary" (click)="ai.dismissDownloadDialog()">Not now</button>
            <button type="button" (click)="ai.approveDownload()">Download</button>
          </div>
        }
      }
    </dialog>
  `,
  styles: `
    dialog {
      width: min(420px, 90vw);
      padding: 24px;
      border: none;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgb(0 0 0 / 0.3);
      font-family: system-ui, sans-serif;
    }

    dialog::backdrop {
      background: rgb(0 0 0 / 0.4);
    }

    h2 {
      margin: 0 0 12px;
      font-size: 1.2rem;
    }

    progress {
      width: 100%;
      height: 12px;
    }

    .percent {
      margin: 4px 0 0;
      text-align: right;
      color: #555;
    }

    .error {
      color: #b71c1c;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }

    button {
      font: inherit;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: #3f51b5;
      color: white;
      cursor: pointer;
    }

    button.secondary {
      background: #e0e0e0;
      color: #333;
    }
  `,
})
export class AiDownloadDialog {
  protected readonly ai = inject(AiService);
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly percent = computed(() => Math.round(this.ai.downloadProgress() * 100));

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      const shouldBeOpen = this.ai.isDownloadDialogOpen();
      if (shouldBeOpen && !dialog.open) dialog.showModal();
      if (!shouldBeOpen && dialog.open) dialog.close();
    });
  }

  // Escape key: let the service decide instead of letting the browser close the dialog
  protected onEscape(event: Event) {
    event.preventDefault();
    this.ai.dismissDownloadDialog();
  }

  // The browser may close the dialog without a cancel event (e.g. Escape without user activation)
  protected onClosed() {
    if (this.ai.isDownloadDialogOpen()) this.ai.dismissDownloadDialog();
  }
}
