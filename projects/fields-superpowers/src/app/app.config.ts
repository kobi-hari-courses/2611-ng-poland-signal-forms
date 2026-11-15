import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAi } from './services/ai/provide-ai';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), 
    provideAi()
  ],
};
