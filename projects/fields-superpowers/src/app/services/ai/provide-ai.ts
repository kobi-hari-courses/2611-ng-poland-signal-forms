import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { AiService } from './ai.service';

/**
 * Enables the app's AI features: kicks off the model availability check
 * (and the consent dialog, if a download is needed) on application startup.
 */
export function provideAi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      // Deliberately not returning the promise - enable() stays pending while the
      // consent dialog is open, and bootstrap must not wait for the user's answer.
      void inject(AiService).enable();
    }),
  ]);
}
