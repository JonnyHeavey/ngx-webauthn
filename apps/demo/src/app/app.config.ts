import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { appRoutes } from './app.routes';
import { provideWebAuthn } from 'ngx-webauthn';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideAnimationsAsync(),
    provideWebAuthn(
      {
        // Required: Human-readable name for your application
        name: 'WebAuthn Demo',
        // Required for production: Must match your domain
        // For development on localhost, use 'localhost'
        // For production, use your actual domain (e.g., 'example.com' or 'auth.example.com')
        id: 'localhost',
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
