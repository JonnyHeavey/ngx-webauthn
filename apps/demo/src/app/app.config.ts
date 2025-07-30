import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { provideWebAuthn } from 'ngx-webauthn';

/**
 * Determines the appropriate RP ID based on the current hostname
 */
function getRpId(): string {
  if (typeof window === 'undefined') {
    return 'localhost'; // Fallback for SSR
  }

  const hostname = window.location.hostname;

  // For localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }

  // For GitHub Pages deployment
  if (hostname === 'jonnyheavey.github.io') {
    return 'jonnyheavey.github.io';
  }

  // For any other deployment, use the current hostname
  return hostname;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
    provideWebAuthn(
      {
        // Required: Human-readable name for your application
        name: 'WebAuthn Demo',
        // Dynamically set the RP ID based on the current hostname
        // This ensures the demo works on both localhost and GitHub Pages
        id: getRpId(),
      },
      {
        // Optional configuration overrides
        defaultTimeout: 60000, // 60 seconds
        // You can add more options here:
        // enforceUserVerification: false,
        // defaultAttestation: 'none',
        // defaultAlgorithms: [custom algorithms]
      }
    ),
  ],
};
