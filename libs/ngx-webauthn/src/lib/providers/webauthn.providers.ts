/**
 * WebAuthn Providers
 * Modern Angular standalone provider function for WebAuthn service
 */

import type { Provider } from '@angular/core';
import { WebAuthnService } from '../services/webauthn.service';
import type {
  WebAuthnConfig,
  RelyingPartyConfig,
} from '../model/service-config';
import { WEBAUTHN_CONFIG, createWebAuthnConfig } from '../model/service-config';

/**
 * Provides WebAuthn service with required relying party configuration
 *
 * @param relyingParty Required relying party configuration
 * @param config Optional configuration overrides
 * @returns Array of providers for WebAuthn functionality
 *
 * @example
 * ```typescript
 * // main.ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideWebAuthn(
 *       { name: 'My App', id: 'myapp.com' },
 *       { defaultTimeout: 30000 }
 *     )
 *   ]
 * });
 * ```
 */
export function provideWebAuthn(
  relyingParty: RelyingPartyConfig,
  config: Partial<Omit<WebAuthnConfig, 'relyingParty'>> = {}
): Provider[] {
  return [
    {
      provide: WEBAUTHN_CONFIG,
      useValue: createWebAuthnConfig(relyingParty, config),
    },
    WebAuthnService,
  ];
}
