import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAi } from './services/ai/provide-ai';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAi(),
    provideSignalFormsConfig({
      classes: {
        'field-invalid': ({ state }) => state().invalid() && state().touched(),
      },
    }),
  ],
};
