/**
 * WebAuthn Providers
 * Modern Angular standalone provider function for WebAuthn service
 */

import { Provider } from '@angular/core';
import { WebAuthnService } from '../services/webauthn.service';
import {
  WebAuthnConfig,
  RelyingPartyConfig,
  WEBAUTHN_CONFIG,
  createWebAuthnConfig,
} from '../config/webauthn.config';

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

/**
 * @deprecated Use provideWebAuthn(relyingParty, config) instead.
 * This version is kept for backward compatibility but requires relying party information.
 */
export function provideWebAuthnLegacy(config: WebAuthnConfig): Provider[] {
  if (!config.relyingParty) {
    throw new Error(
      'WebAuthn configuration must include relying party information. Use provideWebAuthn(relyingParty, config) instead.'
    );
  }

  return [
    {
      provide: WEBAUTHN_CONFIG,
      useValue: config,
    },
    WebAuthnService,
  ];
}
